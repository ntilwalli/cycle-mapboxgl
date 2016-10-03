import {Observable as O} from 'rxjs'

export default function fromMapboxEvent(diffMap, eventName) {
  //console.log("fromEvent...")
  //console.log(element)
  return O.create(observer => {
    const handler = e => observer.next(e)
    diffMap.getMap().on(eventName, handler)
    return () => diffMap.off(eventName, handler)
  })
}

// Event types
//
// webglcontextlost
// webglcontextrestored
// touchend
// touchcancel
// touchstart
// mousemove
// mouseup
// error
// dataloading
// touchmove
// move
// click
// dblclick
// contextmenu
// mousedown
// mouseout
// render
// data
// load
// movestart
// moveend
// zoomend
// zoom
// zoomstart
// boxzoomend
// boxzoomstart
// boxzoomcancel
// rotateend
// rotateend
// rotatestart
// dragend
// dragstart
// drag
// pitch
