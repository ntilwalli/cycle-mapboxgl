import test from 'tape-catch'
import xs from 'xstream'
import delay from 'xstream/extra/delay'
import {VNode} from 'virtual-dom'
import {makeMapDOMDriver} from '../src/cycle-mapdom'

const noop = () => {}
const noopListener = {
  next: noop,
  error: noop,
  complete: noop
}

test("Basic functionality including instantiating VDOM after element is created", t => {
  t.equals(typeof makeMapDOMDriver, 'function', "should be a function")
  t.throws(() => makeMapDOMDriver(), `should throw when missing accessToken`)

  let rootEl = document.createElement("div")
  rootEl.setAttribute("id", "testId")
  let bodyEl = document.body.appendChild(rootEl)


  let testVMaps = [
    new VNode('map', {anchorId: "testId", centerZoom: {center: [4, 5], zoom: 5}}),
    new VNode('map', {anchorId: "testId", centerZoom: {center: [4, 5], zoom: 5}}, [
      new VNode('tileLayer', {tile: "testTile", attributes: {id: "testTile1"}})
    ])
  ]

  //console.log(`testId element`)
  //console.log(document.getElementById('testId'))

  let map$ = xs.periodic(500).take(2).map(x => testVMaps[x]).compose(delay(4))

  let outFunc = makeMapDOMDriver("pk.eyJ1IjoibXJyZWRlYXJzIiwiYSI6IjQtVVRTZkEifQ.ef_cKBTmj8rSr7VypppZdg")
  t.equals(typeof outFunc, 'function', "should output a function")
  let outVal = outFunc(map$)
  t.ok(outVal.chooseMap, "should output object with valid chooseMap method")
  let theMap = outVal.chooseMap('testId')
  t.ok(theMap.select, "chooseMap should output object with valid select")
  let theMapDOM = theMap.select('testId')
  t.ok(theMapDOM.select && theMapDOM.events, "select should output object with valid select and events methods")

  setTimeout(() => {
    t.ok(rootEl.mapDOM, "should have valid mapDOM property on given element")
    document.body.removeChild(rootEl)
  }, 600)

  setTimeout(() => {
    // t.notOk(rootEl.mapDOM, "map object should be removed after root element removal")
    rootEl = document.createElement("div")
    rootEl.setAttribute("id", "testId")
    bodyEl = document.body.appendChild(rootEl)
  }, 1500)

  setTimeout(() => {
    t.ok(rootEl.mapDOM, "should have valid mapDOM property on element when vtree is sent first then element attached")
    t.end()
  }, 2000)

})


test("call to selectMap, select, events returns expected objects", t => {
  t.plan(9)
  let rootEl = document.createElement("div")
  rootEl.setAttribute("id", "testId3")
  let bodyEl = document.body.appendChild(rootEl)


  let testVMaps = [
    new VNode('map', {anchorId: "testId3", centerZoom: {center: [4, 5], zoom: 5}}),
    new VNode('map', {anchorId: "testId3", centerZoom: {center: [4, 5], zoom: 5}}, [
      new VNode('tileLayer', {tile: "testTile", attributes: {id: "testTile3"}})
    ])
  ]

  let map$ = xs.periodic(500).take(2).map(x => testVMaps[x])

  let outFunc = makeMapDOMDriver(`pk.eyJ1IjoibXJyZWRlYXJzIiwiYSI6IjQtVVRTZkEifQ.ef_cKBTmj8rSr7VypppZdg`)
  let outVal = outFunc(map$)
  t.equal(typeof outVal.chooseMap, 'function', "makeMapDOMDriver should return object with chooseMap property that is a function")
  let theMap = outVal.chooseMap('testId3')
  t.equal(typeof theMap.select, 'function', "chooseMap should return object with select property that is a function")
  t.ok(typeof theMap.observable, "chooseMap should return object with events property that is an observable")

  let theMapDOM = theMap.select("#testTile3")

  t.equal(typeof theMapDOM.events, 'function', "select should return object with events property that is a function")
  t.equal(typeof theMapDOM.select, 'function', "select should return object with select property that is a function")
  t.ok(typeof theMapDOM.observable, 'function', "select should return an observable property")

  let elem$ = theMapDOM.observable
  t.ok(elem$.addListener, "elem$ should have addListener function")

  elem$.addListener({
    next: x => {
      x.forEach(y => {
        t.equal(y.tagName, "TILELAYER", "selected element should be tileLayer")
        t.ok(y.instance, "element should have in attached instance property")
      })
    },
    error: (e) => {
      console.log(e)
    },
    complete: () => {
      console.log(`complete`)
    }
  })
  //.publish().refCount().subscribe()
})
