from pathlib import Path
import json
FT=.3048
def pt(x,y):return {"x":round(x*FT,5),"y":round(y*FT,5)}
rooms=[]
def room(id,name,points,declared=None,outdoor=False,ceiling=2.8):
 r={"id":id,"name":name,"boundary":[pt(x,y) for x,y in points],"floorMaterialKey":"tile" if outdoor or any(k in name.lower() for k in ["bath","kitchen","laundry"]) else "wood","outdoor":outdoor,"ceilingHeight":ceiling,"source":"manual","dimensionStatus":"review"}
 if declared:
  w,l,text=declared;r["declaredSize"]={"width":w*FT,"length":l*FT,"sourceText":text,"confidence":1}
 rooms.append(r)
room("ref-master-bath","Master bath",[(.75,.75),(13.75,.75),(13.75,9.75),(.75,9.75)],(13,9,'13\'-0" × 9\'-0"'))
room("ref-wardrobe","Wardrobe",[(.75,10.25),(9.75,10.25),(9.75,12.25),(13.75,12.25),(13.75,19.125),(.75,19.125)],(13,8.875,'13\'-0" × 8\'-10½"'))
room("ref-master-bedroom","Master bedroom",[(14.75,4),(33.5,4),(33.5,9.75),(35.75,9.75),(35.75,19),(14.75,19)],(21,15,'21\'-0" × 15\'-0"'))
room("ref-servant-bath","Servant bath",[(25.25,.75),(31.25,.75),(31.25,3.16667),(25.25,3.16667)],(6,2+5/12,'6\'-0" × 2\'-5"'))
room("ref-laundry","Laundry",[(34,4),(39.75,4),(39.75,9),(34,9)])
room("ref-kitchen","Kitchen",[(.75,19.75),(13.75,19.75),(13.75,34.5),(.75,34.5)],(13,14.75,'13\'-0" × 14\'-9"'))
room("ref-service-kitchen","Service kitchen",[(.75,35.25),(9.5,35.25),(9.5,40.833),(.75,40.833)])
room("ref-open-sky","Open to sky",[(10.25,35.25),(13.75,35.25),(13.75,40.833),(10.25,40.833)],outdoor=True)
room("ref-lobby","Lobby",[(14.75,34.5),(21,34.5),(21,40.833),(14.75,40.833)])
room("ref-tv-lounge","TV lounge",[(14.75,19.75),(35.75,19.75),(35.75,44.75),(21.5,44.75),(21.5,34.5),(23.75,31.5),(23.75,28),(19.5,28),(19.5,27.25),(14.75,27.25)],(21,25,'21\'-0" × 25\'-0"'),ceiling=5.6)
room("ref-entrance","Entrance lobby",[(14.75,41.75),(20.75,41.75),(20.75,55.75),(14.75,55.75)],(6,14,'6\' × 14\''))
room("ref-drawing","Drawing room",[(.75,41.75),(13.75,41.75),(13.75,60.75),(.75,60.75)],(13,19,'13\'-0" × 19\'-0"'))
room("ref-front-bath","Bathroom",[(.75,61.75),(8.25,61.75),(8.25,66.75),(.75,66.75)],(7.5,5,'7\'-6" × 5\'-0"'))
room("ref-front-passage","Front passage",[(.75,67.5),(13.75,67.5),(13.75,69.5),(.75,69.5)],outdoor=True)
room("ref-car-porch","Car porch",[(21.5,45),(40,45),(40,63.25),(21.5,63.25)],(18.5,18.25,'18\'-6" × 18\'-3"'),outdoor=True)
room("ref-driveway","Driveway",[(21.5,63.75),(40,63.75),(40,70),(21.5,70)],outdoor=True)
walls=[]
def wall(id,x,y,x2,y2,exterior=False,height=2.8):
 walls.append({"id":id,"start":pt(x,y),"end":pt(x2,y2),"thickness":.2286 if exterior else .1524,"height":height,"type":"exterior" if exterior else "interior","materialKey":"painted-wall","color":"#f0ede5","source":"manual"})
wall("ref-west",.375,.375,.375,69.625,True)
wall("ref-north",.375,.375,39.75,.375,True)
wall("ref-east-upper",39.75,.375,39.75,45.125,True)
wall("ref-east-front",39.75,45.125,39.75,69.625,True,height=1.2)
wall("ref-south",.375,69.625,39.75,69.625,True,height=1.8)
wall("ref-left-upper",14.25,.75,14.25,19.375)
wall("ref-master-bath-south",.75,10.125,9.875,10.125)
wall("ref-bath-wardrobe-return",9.875,10.125,9.875,12.0)
wall("ref-wardrobe-north",9.875,12.0,14.25,12.0)
wall("ref-bedroom-north",14.25,3.625,34.0,3.625)
wall("ref-bedroom-east",36.125,9.75,36.125,19.375)
wall("ref-laundry-west",33.875,3.625,33.875,9.75)
wall("ref-laundry-south",33.875,9.375,36.125,9.375)
wall("ref-laundry-north",33.875,3.625,39.75,3.625)
wall("ref-servant-west",24.875,.75,24.875,3.375)
wall("ref-servant-east",31.625,.75,31.625,3.375)
wall("ref-servant-south",24.875,3.375,31.625,3.375)
wall("ref-upper-south",.75,19.375,36.125,19.375,height=5.6)
wall("ref-kitchen-east",14.25,19.375,14.25,34.875)
wall("ref-kitchen-south",.75,34.875,14.25,34.875)
wall("ref-service-east",9.875,34.875,9.875,41.25)
wall("ref-left-middle",.75,41.25,21.25,41.25)
wall("ref-drawing-east",14.25,41.25,14.25,61.125)
wall("ref-entrance-east",21.25,41.25,21.25,55.75)
wall("ref-drawing-south",.75,61.125,14.25,61.125)
wall("ref-bath-east",8.625,61.125,8.625,67.125)
wall("ref-bath-south",.75,67.125,8.625,67.125)
wall("ref-tv-east",36.125,19.375,36.125,45.125,height=5.6)
wall("ref-tv-south",21.25,45.125,36.125,45.125,height=5.6)
# The curved lobby partition is traced as short segments, rather than a rectangular wall.
curve=[(21.25,40.833),(21.25,34.5),(21.45,33.5),(22.0,32.75),(22.8,32.0),(23.4,31.4),(23.75,30.5),(23.75,28)]
for i,(a,b) in enumerate(zip(curve,curve[1:])):wall("ref-lobby-curve-"+str(i),*a,*b)
doors=[]
def door(id,wallid,offset,width,swing="left",source="detected",height=2.1):
 doors.append({"id":id,"wallId":wallid,"offset":offset*FT,"width":width*FT,"height":height,"swing":swing,"openAngle":80 if swing in ("left","right") else 0,"color":"#ad825b","frameColor":"#887f6d","source":source,"confidence":.65 if source=="detected" else 0})
door("ref-master-bath-door","ref-left-upper",6.25,2.5)
door("ref-wardrobe-door","ref-left-upper",12,3,swing="right")
door("ref-bedroom-door","ref-upper-south",14,4)
door("ref-laundry-door","ref-laundry-west",2.2,2.25,source="proposed")
door("ref-servant-door","ref-servant-south",2,2.5)
door("ref-kitchen-arch","ref-kitchen-east",9.5,4,swing="none",source="proposed")
door("ref-service-door","ref-service-east",1,2.75,source="proposed")
door("ref-entry-door","ref-left-middle",14.5,3)
door("ref-drawing-door","ref-drawing-east",5,4,swing="right")
door("ref-car-porch-arch","ref-entrance-east",5.5,6,swing="none",source="proposed",height=2.4384)
door("ref-front-bath-door","ref-drawing-south",.8,2.5)
door("ref-front-gate","ref-south",21.5,17,swing="sliding",source="proposed",height=1.8)
next(d for d in doors if d['id']=='ref-front-gate')['openAngle']=0
windows=[]
def window(id,wallid,offset,width,height=1.2,sill=.9):
 windows.append({"id":id,"wallId":wallid,"offset":offset*FT,"width":width*FT,"height":height,"sillHeight":sill,"color":"#a3c5d4","frameColor":"#62716b","source":"proposed","confidence":0})
window("ref-bath-window","ref-west",2.5,2, height=.7,sill=1.4)
window("ref-wardrobe-window","ref-west",13,3)
window("ref-kitchen-window","ref-west",25,4)
window("ref-drawing-window","ref-west",49,5)
window("ref-bedroom-window","ref-bedroom-east",1.5,5)
window("ref-tv-window","ref-tv-east",14,5,height=2,sill=.75)
stairs=[{"id":"ref-curved-stair","boundary":[pt(19.25,19.75),pt(35.25,19.75),pt(35.25,27.75),pt(19.25,27.75)],"fromLevel":0,"toLevel":1,"direction":"up","shape":"curved","height":2.8,"steps":16,"rotation":0,"color":"#c6b598","source":"proposed"},{"id":"ref-front-steps","boundary":[pt(15,56),pt(21,56),pt(21,61)],"fromLevel":0,"toLevel":1,"direction":"up","shape":"straight","height":.6096,"steps":4,"rotation":180,"color":"#b9ad97","source":"proposed"}]
columns=[{"id":"ref-porch-column-1","position":pt(21.25,57.5),"width":.2286,"depth":.2286,"height":2.8,"color":"#eee8da"},{"id":"ref-porch-column-2","position":pt(39.75,57.5),"width":.2286,"depth":.2286,"height":2.8,"color":"#eee8da"}]
dimensions=[{"id":"ref-width-dim","text":"40'-1½\" (overall top label; confirm small fraction)","axis":"x","valueMeters":40.125*FT,"confidence":.85,"status":"review"},{"id":"ref-length-dim","text":"70' overall length","axis":"y","valueMeters":70*FT,"confidence":.9,"status":"review"}]
dimensions += [{"id":"ref-dim-"+r["id"],"text":r["declaredSize"]["sourceText"],"axis":"room","roomId":r["id"],"valueMeters":r["declaredSize"]["width"],"lengthMeters":r["declaredSize"]["length"],"confidence":r["declaredSize"]["confidence"],"status":"review"} for r in rooms if "declaredSize" in r]
plan={"schemaVersion":1,"unit":"ft","plot":{"width":40.125*FT,"length":70*FT,"marlaSquareFeet":272.25},"walls":walls,"rooms":rooms,"doors":doors,"windows":windows,"stairs":stairs,"columns":columns,"furniture":[],"metadata":{"analysisEngine":"reviewed-trace","accuracyStatus":"draft","confidence":.85,"dimensions":dimensions,"analysisNotes":["This is a human retrace of the supplied map1 image, not an automatic detection result.","Printed room dimensions are used as exact footprint constraints. Curved, notched and unlabelled boundaries are an approximate trace that must be checked.","The small overall-width fraction, service kitchen, laundry footprint and curved lobby partition require source review.","Windows are proposed; no unambiguous window schedule was readable in the image. Door widths without printed labels are estimates.","The double-height ceiling and stair rise/step count are visualization assumptions; this image does not specify those elevations."],"imageRegistration":{"width":585,"height":796,"left":70,"top":39,"pixelsPerMeter":(456-70)/(40.125*FT),"pixelsPerMeterY":(710-39)/(70*FT)}}}
dest=Path("frontend/public/reference");dest.mkdir(exist_ok=True)
(dest/"map1-retraced.json").write_text(json.dumps(plan,indent=2),encoding="utf-8")
print("Retraced reference:",len(rooms),"spaces,",len(walls),"wall segments,",len(doors),"openings,",len(windows),"proposed windows")
