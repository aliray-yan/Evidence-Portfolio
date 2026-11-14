import {expect,test} from 'vitest';
import {rtpDelta,timing,boxesAt,type Finding} from './live';
test('source-clock comparison survives 32-bit timestamp wrap',()=>{
 expect(rtpDelta(100,4294967200)).toBe(196);
 expect(timing({start_rtp:4294967200,end_rtp:100},0)).toBe('aligned');
 expect(timing({start_rtp:4294967200,end_rtp:100},101)).toBe('late');
 expect(timing({start_rtp:10,end_rtp:20})).toBe('unknown');
 expect(timing({start_rtp:10,end_rtp:20},9)).toBe('ahead');
});
test('only genuine exact-frame boxes can reach the overlay',()=>{
 const r={boxes:[{rtp:42,xyxy:[.1,.2,.5,.8],label:'detector observation'}]} as Finding;
 expect(boxesAt([r],42)).toHaveLength(1);
 expect(boxesAt([r],43)).toEqual([]);
 expect(boxesAt([r])).toEqual([]);
 expect(boxesAt([{...r,boxes:undefined}],42)).toEqual([]);
});
