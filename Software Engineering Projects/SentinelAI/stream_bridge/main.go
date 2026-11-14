// The bridge only depacketizes the original local RTSP stream. Python performs
// decoding/inference. Original RTP timestamps travel with every access unit.
package main

import (
 "bufio"
 "encoding/json"
 "fmt"
 "net"
 "os"
 "sync/atomic"
 "time"

 "github.com/bluenviron/gortsplib/v5"
 "github.com/bluenviron/gortsplib/v5/pkg/base"
 "github.com/bluenviron/gortsplib/v5/pkg/format"
 "github.com/pion/rtp"
)

type input struct { URL string `json:"url"` }
type unit struct {
 Kind string `json:"kind"`
 Codec string `json:"codec"`
 RTP uint32 `json:"rtp"`
 SSRC uint32 `json:"ssrc"`
 Clock int `json:"clock"`
 NTP float64 `json:"ntp"`
 Received float64 `json:"received"`
 Key bool `json:"key"`
 Channels int `json:"channels,omitempty"`
 Data []byte `json:"data"`
 Config []byte `json:"config,omitempty"`
 Dropped uint64 `json:"bridge_dropped"`
}

func run() error {
 var settings input
 scanner:=bufio.NewScanner(os.Stdin)
 scanner.Buffer(make([]byte,4096),8192)
 if !scanner.Scan() { return fmt.Errorf("missing local stream configuration") }
 if json.Unmarshal(scanner.Bytes(),&settings)!=nil { return fmt.Errorf("invalid stream configuration") }
 u,err:=base.ParseURL(settings.URL)
 if err!=nil { return fmt.Errorf("invalid local stream URL") }
 host,_,err:=net.SplitHostPort(u.Host)
 if err!=nil || host!="127.0.0.1" || u.Scheme!="rtsp" { return fmt.Errorf("bridge only accepts loopback RTSP") }
 transport:=gortsplib.ProtocolTCP
 c:=gortsplib.Client{Scheme:u.Scheme,Host:u.Host,Protocol:&transport}
 if c.Start()!=nil { return fmt.Errorf("local RTSP connection failed") }
 defer c.Close()
 desc,_,err:=c.Describe(u)
 if err!=nil { return fmt.Errorf("stream is not ready") }
 // Absorb brief Python/model-load scheduling stalls without unbounded memory.
 // Both unit count and compressed payload bytes are capped.
 queue:=make(chan unit,256)
 var dropped atomic.Uint64
 var queuedBytes atomic.Int64
 emit:=func(value unit){
  if len(value.Data)>2*1024*1024 { dropped.Add(1);return }
  size:=int64(len(value.Data))
  if queuedBytes.Add(size)>8*1024*1024 {queuedBytes.Add(-size);dropped.Add(1);return}
  value.Dropped=dropped.Load()
  select {case queue<-value: default:queuedBytes.Add(-size);dropped.Add(1)}
 }
 writerFailed:=make(chan bool,1)
 go func(){encoder:=json.NewEncoder(os.Stdout);for value:=range queue {err:=encoder.Encode(value);queuedBytes.Add(-int64(len(value.Data)));if err!=nil {writerFailed<-true;return}}}()
 var video *format.H264
 media:=desc.FindFormat(&video)
 if media==nil { return fmt.Errorf("H264 camera codec required") }
 decoder,err:=video.CreateDecoder()
 if err!=nil { return fmt.Errorf("H264 depacketizer failed") }
 config:=[]byte{}
 for _,nal:=range [][]byte{video.SPS,video.PPS} { if len(nal)>0 {config=append(config,0,0,0,1);config=append(config,nal...)} }
 if _,err=c.Setup(desc.BaseURL,media,0,0);err!=nil {return fmt.Errorf("video setup failed")}
 c.OnPacketRTP(media,video,func(packet *rtp.Packet){
  data,err:=decoder.Decode(packet)
  if err!=nil{return}
  value:=unit{Kind:"video",Codec:"h264",RTP:packet.Timestamp,SSRC:packet.SSRC,Clock:90000,Received:float64(time.Now().UnixNano())/1e9,Config:config}
  if ntp,ok:=c.PacketNTP(media,packet);ok {value.NTP=float64(ntp.UnixNano())/1e9}
  for _,nal:=range data {if len(nal)>0&&nal[0]&31==5 {value.Key=true};value.Data=append(value.Data,0,0,0,1);value.Data=append(value.Data,nal...)}
  emit(value)
 })
 var audio *format.Opus
 audioMedia:=desc.FindFormat(&audio)
 if audioMedia!=nil {
  if _,err=c.Setup(desc.BaseURL,audioMedia,0,0);err!=nil{return fmt.Errorf("audio setup failed")}
  c.OnPacketRTP(audioMedia,audio,func(packet *rtp.Packet){
   value:=unit{Kind:"audio",Codec:"opus",RTP:packet.Timestamp,SSRC:packet.SSRC,Clock:48000,Received:float64(time.Now().UnixNano())/1e9,Channels:audio.ChannelCount,Data:append([]byte{},packet.Payload...)}
   if ntp,ok:=c.PacketNTP(audioMedia,packet);ok {value.NTP=float64(ntp.UnixNano())/1e9}
   emit(value)
  })
 }
 if _,err=c.Play(nil);err!=nil {return fmt.Errorf("RTSP playback failed")}
 ended:=make(chan error,1);go func(){ended<-c.Wait()}()
 select {case <-ended:return fmt.Errorf("source stream disconnected");case <-writerFailed:return nil}
}

func main(){if err:=run();err!=nil{fmt.Fprintln(os.Stderr,err);os.Exit(1)}}
