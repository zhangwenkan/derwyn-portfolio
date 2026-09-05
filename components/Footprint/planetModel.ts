/* eslint-disable */
// @ts-nocheck
import * as THREE from "three";

const H = THREE;

function H1(s, t = !1) {
  let e = s[0].index !== null,
    n = new Set(Object.keys(s[0].attributes)),
    i = new Set(Object.keys(s[0].morphAttributes)),
    r = {},
    a = {},
    o = s[0].morphTargetsRelative,
    c = new THREE.BufferGeometry(),
    l = 0;
  for (let h = 0; h < s.length; ++h) {
    let u = s[h],
      d = 0;
    if (e !== (u.index !== null)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."), null;
    for (let f in u.attributes) {
      if (!n.has(f)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + '. All geometries must have compatible attributes; make sure "' + f + '" attribute exists among all geometries, or in none of them.'), null;
      r[f] === void 0 && (r[f] = []), r[f].push(u.attributes[f]), d++;
    }
    if (d !== n.size) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ". Make sure all geometries have the same number of attributes."), null;
    if (o !== u.morphTargetsRelative) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ". .morphTargetsRelative must be consistent throughout all geometries."), null;
    for (let f in u.morphAttributes) {
      if (!i.has(f)) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ".  .morphAttributes must be consistent throughout all geometries."), null;
      a[f] === void 0 && (a[f] = []), a[f].push(u.morphAttributes[f]);
    }
    if (t) {
      let f;
      if (e) f = u.index.count;else if (u.attributes.position !== void 0) f = u.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index " + h + ". The geometry must have either an index or a position attribute"), null;
      c.addGroup(l, f, h), l += f;
    }
  }
  if (e) {
    let h = 0,
      u = [];
    for (let d = 0; d < s.length; ++d) {
      let f = s[d].index;
      for (let p = 0; p < f.count; ++p) u.push(f.getX(p) + h);
      h += s[d].attributes.position.count;
    }
    c.setIndex(u);
  }
  for (let h in r) {
    let u = G1(r[h]);
    if (!u) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + h + " attribute."), null;
    c.setAttribute(h, u);
  }
  for (let h in a) {
    let u = a[h][0].length;
    if (u !== 0) {
      c.morphAttributes = c.morphAttributes || {}, c.morphAttributes[h] = [];
      for (let d = 0; d < u; ++d) {
        let f = [];
        for (let x = 0; x < a[h].length; ++x) f.push(a[h][x][d]);
        let p = G1(f);
        if (!p) return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the " + h + " morphAttribute."), null;
        c.morphAttributes[h].push(p);
      }
    }
  }
  return c;
}

function G1(s) {
  let t,
    e,
    n,
    i = -1,
    r = 0;
  for (let l = 0; l < s.length; ++l) {
    let h = s[l];
    if (t === void 0 && (t = h.array.constructor), t !== h.array.constructor) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."), null;
    if (e === void 0 && (e = h.itemSize), e !== h.itemSize) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."), null;
    if (n === void 0 && (n = h.normalized), n !== h.normalized) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."), null;
    if (i === -1 && (i = h.gpuType), i !== h.gpuType) return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."), null;
    r += h.count * e;
  }
  let a = new t(r),
    o = new THREE.BufferAttribute(a, e, n),
    c = 0;
  for (let l = 0; l < s.length; ++l) {
    let h = s[l];
    if (h.isInterleavedBufferAttribute) {
      let u = c / e;
      for (let d = 0, f = h.count; d < f; d++) for (let p = 0; p < e; p++) {
        let x = h.getComponent(d, p);
        o.setComponent(d + u, p, x);
      }
    } else a.set(h.array, c);
    c += h.count * e;
  }
  return i !== void 0 && (o.gpuType = i), o;
}

var pe = Math.PI * 2,
  y0 = [],
  _0 = 2048;

function Gn(s = 0, t = 1) {
  return _0 = _0 * 1664525 + 1013904223 >>> 0, s + (t - s) * _0 / 4294967296;
}

var v0 = new Map();

function Tt(s, t = {}) {
  if (s?.isMaterial) return s;
  let e = (s?.isColor ? s.getHexString() : String(s)) + JSON.stringify(t);
  return v0.has(e) || v0.set(e, new THREE.MeshStandardMaterial({
    color: s,
    flatShading: !0,
    roughness: .88,
    metalness: 0,
    ...t
  })), v0.get(e);
}

function ft(s, t = 0, e = 0, n = 0, i = 1, r = 0) {
  let a = new THREE.Group();
  return a.position.set(t, e, n), a.scale.setScalar(i), a.rotation.y = r, s?.add(a), a;
}

function ue(s, t) {
  return s.userData.dynamic = !0, y0.push(t), s;
}

function vt(s, t, e, n = 0, i = 0, r = 0) {
  let a = new THREE.Mesh(t, Tt(e));
  return a.position.set(n, i, r), a.castShadow = !a.material.transparent, a.receiveShadow = !0, s.add(a), a;
}

var OS = new THREE.BoxGeometry(1, 1, 1),
  BS = new THREE.IcosahedronGeometry(1, 0),
  zS = new THREE.IcosahedronGeometry(1, 1);

function z(s, t, e, n, i, r, a, o, c = 0) {
  let l = vt(s, OS, o, t, e, n);
  return l.scale.set(i, r, a), l.rotation.y = c, l;
}

function Ot(s, t, e, n, i, r, a, o, c = 0) {
  let l = vt(s, c ? zS : BS, o, t, e, n);
  return l.scale.set(i, r, a), l.rotation.set(Gn(-.15, .15), Gn(0, pe), Gn(-.12, .12)), l;
}

function Kt(s, t, e, n, i, r, a, o = 6, c = 0) {
  return vt(s, new THREE.CylinderGeometry(c, i, r, o, 1), a, t, e, n);
}

function gt(s, t, e, n, i, r, a, o = 8) {
  return Kt(s, t, e, n, i, r, a, o, i);
}

function it(s, t, e, n, i, r = 5, a = n) {
  let o = new THREE.Vector3(...t),
    c = new THREE.Vector3(...e),
    l = c.clone().sub(o),
    h = vt(s, new THREE.CylinderGeometry(a, n, l.length(), r), i);
  return h.position.copy(o).add(c).multiplyScalar(.5), h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), l.normalize()), h;
}

function Ln(s, t, e, n, i, r) {
  let a = new THREE.Vector3(...t),
    o = new THREE.Vector3(...e),
    c = o.clone().sub(a),
    l = z(s, 0, 0, 0, n, c.length(), i, r);
  return l.position.copy(a).add(o).multiplyScalar(.5), l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), c.normalize()), l;
}

function Jt(s, t, e) {
  let n = new THREE.BufferGeometry();
  n.setAttribute("position", new THREE.Float32BufferAttribute(s.flat(1 / 0), 3)), t && n.setIndex(t.flat(1 / 0));
  let i = n.index ? n.toNonIndexed() : n;
  return i !== n && n.dispose(), i.computeVertexNormals(), e && i.setAttribute("color", new THREE.Float32BufferAttribute(e.flat(1 / 0), 3)), i;
}

function uh(s, t, e, n, i = 0) {
  let r = new THREE.Shape();
  t.forEach(([o, c], l) => l ? r.lineTo(o, -c) : r.moveTo(o, -c)), r.closePath();
  let a = i ? new THREE.ExtrudeGeometry(r, {
    depth: i,
    bevelEnabled: !1,
    steps: 1
  }) : new THREE.ShapeGeometry(r);
  return a.rotateX(-Math.PI / 2), vt(s, a, n, 0, e - i, 0);
}

function Ro(s, t, e, n, i = 0) {
  let r = [],
    a = [];
  for (let o = 0; o < t.length; o++) {
    let c = t[Math.max(0, o - 1)],
      l = t[Math.min(t.length - 1, o + 1)],
      h = l[0] - c[0],
      u = l[2] - c[2],
      d = Math.hypot(h, u) || 1,
      f = Array.isArray(e) ? e[o] : e;
    r.push([t[o][0] - u / d * f / 2, t[o][1] + i, t[o][2] + h / d * f / 2]), r.push([t[o][0] + u / d * f / 2, t[o][1] + i, t[o][2] - h / d * f / 2]), o && a.push([2 * o - 2, 2 * o - 1, 2 * o], [2 * o - 1, 2 * o + 1, 2 * o]);
  }
  return vt(s, Jt(r, a), Tt(n, {
    side: THREE.DoubleSide
  }));
}

function qr(s, t, e, n = 1.5, i = "#27865a", r = .06) {
  let a = ft(s, t, r, e, 1, Gn(0, pe));
  a.name = "pine", a.userData.height = n, gt(a, 0, n * .21, 0, n * .045, n * .42, "#805338", 5);
  let o = new THREE.Color(i);
  return Kt(a, 0, n * .42, 0, n * .31, n * .57, o.clone().multiplyScalar(.8), 5), Kt(a, 0, n * .66, 0, n * .255, n * .55, o, 5), Kt(a, 0, n * .87, 0, n * .17, n * .45, o.clone().multiplyScalar(1.1), 5), a;
}

function Qn(s, t, e, n = "#81ad42", i = 1, r = .06) {
  let a = ft(s, t, r, e, i, Gn(0, pe)),
    o = [];
  for (let c = 0; c < 3; c++) {
    let l = c * 2.399,
      h = Math.cos(l) * .07,
      u = Math.sin(l) * .07;
    o.push([h - .028, 0, u], [h + .07, .17 + Gn(0, .12), u + .04], [h + .028, 0, u]);
  }
  return vt(a, Jt(o), Tt(n, {
    side: THREE.DoubleSide
  })), a;
}

function Yr(s, t, e, n = 1.7, i = 0, r = .05) {
  let a = ft(s, t, r, e, 1, i);
  a.name = "palm", a.userData.height = n;
  let o = .23;
  for (let c = 0; c < 6; c++) {
    let l = c / 6,
      h = (c + 1) / 6;
    it(a, [o * l * l, n * l, 0], [o * h * h, n * h, 0], .07 * (1 - l * .48), c % 2 ? "#a47646" : "#ba8c54", 6, .07 * (1 - h * .48));
  }
  for (let c = 0; c < 7; c++) {
    let l = c * pe / 7,
      h = Gn(.71, .95),
      u = .145,
      d = new THREE.Vector3(Math.cos(l), 0, Math.sin(l)),
      f = new THREE.Vector3(-d.z, 0, d.x),
      x = [[0, 0, 0], [.31, .16, -u], [.63, .04, -u * .65], [1, -.22, 0], [.63, .04, u * .65], [.31, .16, u], [.4, .2, 0]].map(([m, g, y]) => [o + d.x * m * h + f.x * y, n + g, d.z * m * h + f.z * y]);
    vt(a, Jt(x, [[0, 1, 6], [1, 2, 6], [2, 3, 6], [3, 4, 6], [4, 5, 6], [5, 0, 6]]), Tt(c % 3 === 0 ? "#69a445" : c % 2 ? "#23784f" : "#329259", {
      side: THREE.DoubleSide
    }));
  }
  for (let c = 0; c < 3; c++) Ot(a, o + Math.cos(c * 2.1) * .08, n - .05, Math.sin(c * 2.1) * .09, .078, .08, .073, "#85603a");
  return a;
}

function Zr(s, t, e, n, i, r) {
  let a = t / 2,
    o = e / 2;
  return vt(s, Jt([[-a, n, -o], [a, n, -o], [0, i, -o], [-a, n, o], [a, n, o], [0, i, o]], [[0, 3, 5], [0, 5, 2], [2, 5, 4], [2, 4, 1], [0, 2, 1], [3, 4, 5]]), r);
}

function Js(s, t, e, n, i = .18, r = .22) {
  z(s, t, e, n, i + .052, r + .052, .035, "#f5e4c1"), z(s, t, e, n + .023, i, r, .015, "#70bdc8"), z(s, t, e, n + .038, .017, r, .015, "#f8e5bb"), z(s, t, e, n + .038, i, .017, .015, "#f8e5bb");
}

function Je(s, t = !1) {
  s.updateMatrixWorld(!0);
  let e = new THREE.Matrix4().copy(s.matrixWorld).invert(),
    n = new Map(),
    i = [];
  function r(a, o = !1) {
    let c = o || a.userData.dynamic && !(t && a === s);
    if (a.isMesh && !c && !Array.isArray(a.material) && !a.material.transparent && !a.isInstancedMesh) {
      let l = a.geometry.index ? a.geometry.toNonIndexed() : a.geometry.clone();
      l.applyMatrix4(new THREE.Matrix4().multiplyMatrices(e, a.matrixWorld)), l.deleteAttribute("uv"), l.attributes.normal || l.computeVertexNormals();
      let h = a.material;
      if (h.isMeshStandardMaterial && !h.map && !h.normalMap && !h.roughnessMap && !h.metalnessMap && !h.alphaMap && h.emissive.getHex() === 0 && h.alphaTest === 0 && !h.wireframe) {
        let d = l.getAttribute("position").count,
          f = h.vertexColors ? l.getAttribute("color") : null,
          p = new Float32Array(d * 3);
        for (let x = 0; x < d; x++) p[x * 3] = (f ? f.getX(x) : 1) * h.color.r, p[x * 3 + 1] = (f ? f.getY(x) : 1) * h.color.g, p[x * 3 + 2] = (f ? f.getZ(x) : 1) * h.color.b;
        l.setAttribute("color", new THREE.Float32BufferAttribute(p, 3)), h = Tt("#ffffff", {
          vertexColors: !0,
          roughness: h.roughness,
          metalness: h.metalness,
          side: h.side,
          flatShading: h.flatShading
        });
      }
      let u = h.uuid + "-" + a.castShadow + "-" + a.receiveShadow;
      n.has(u) || n.set(u, {
        material: h,
        cast: a.castShadow,
        receive: a.receiveShadow,
        geometries: []
      }), n.get(u).geometries.push(l), i.push(a);
    }
    for (let l of a.children) r(l, c);
  }
  r(s);
  for (let a of i) a.removeFromParent();
  for (let a of n.values()) {
    let o = H1(a.geometries, !1);
    if (!o) throw new Error("Could not batch static geometry");
    let c = new THREE.Mesh(o, a.material);
    c.castShadow = a.cast, c.receiveShadow = a.receive, s.add(c);
    for (let l of a.geometries) l.dispose();
  }
  s.userData.staticObjects = i.length, s.userData.batches = n.size;
}

function pt(s, t, e, n, i, r, a, o, c = 1) {
  let l = Ot(s, t, e, n, i, r, a, o, c);
  return l.rotation.set(0, 0, 0), l;
}

function ms(s, t, e, n = "#e3c965", i = 1, r = .07) {
  let a = ft(s, t, r, e, i, Gn(0, pe)),
    o = Gn(.12, .23);
  it(a, [0, 0, 0], [.015, o, 0], .009, "#5c833f", 4);
  for (let c = 0; c < 5; c++) {
    let l = c * pe / 5;
    pt(a, Math.cos(l) * .042, o, Math.sin(l) * .042, .04, .014, .024, n, 0).rotation.y = -l;
  }
  pt(a, .002, o + .014, 0, .019, .012, .019, "#e9b344", 0), vt(a, Jt([[0, o * .4, 0], [.09, o * .6, .03], [.025, o * .7, .02]], [[0, 1, 2]]), Tt("#608b3e", {
    side: H.DoubleSide
  }));
}

function Jr(s, t, e, n = 1, i = .065, r = "#4c8b59") {
  let a = ft(s, t, i, e, n, Gn(0, pe));
  for (let o = 0; o < 6; o++) {
    let c = o * pe / 6,
      l = Math.cos(c),
      h = Math.sin(c),
      u = new H.Vector3(-h, 0, l),
      d = [],
      f = [];
    for (let p = 0; p < 6; p++) {
      let x = p / 5,
        m = x * .33,
        g = .27 * Math.sin(x * 2.1);
      if (f.push([l * m, g, h * m]), p !== 0) for (let y of [-1, 1]) {
        let S = .075 * (1 - x * .65);
        d.push([l * m, g, h * m], [l * (m - .055) + u.x * S * y, g + .018, h * (m - .055) + u.z * S * y], [l * (m - .082), g - .018, h * (m - .082)]);
      }
    }
    vt(a, Jt(d), Tt(o % 2 ? r : "#72a15c", {
      side: H.DoubleSide
    }));
    for (let p = 1; p < f.length; p++) it(a, f[p - 1], f[p], .006, "#839d56", 3);
  }
  return a;
}

function qi(s, t, e, n, i = .09, r = "#d4b586") {
  for (let a = 0; a < 3; a++) {
    let o = vt(s, new H.TorusGeometry(i - a * .019, .008, 4, 14), r, t, e + a * .009, n);
    o.rotation.x = Math.PI / 2;
  }
}

function gs(s, t, e, n, i = 1, r = "#aa784d") {
  let a = ft(s, t, e, n, i),
    o = [[.085, 0], [.112, .03], [.126, .13], [.11, .24], [.087, .26]].map(c => new H.Vector2(...c));
  vt(a, new H.LatheGeometry(o, 9), r);
  for (let c of [.045, .205]) {
    let l = vt(a, new H.TorusGeometry(.113, .009, 4, 9), "#69736a", 0, c, 0);
    l.rotation.x = Math.PI / 2;
  }
  gt(a, 0, .259, 0, .087, .009, "#ca9d64", 9);
  for (let c = -1; c <= 1; c++) z(a, c * .043, .267, 0, .008, .005, .15, "#aa7c4d");
  return a;
}

function wn(s, t, e, n, i = 1, r = !1) {
  let a = ft(s, t, e, n, i);
  z(a, 0, .026, 0, .26, .035, .23, "#a67a49");
  for (let o of [-1, 1]) {
    for (let c = 0; c < 3; c++) z(a, o * .13, .06 + c * .051, 0, .021, .039, .25, c % 2 ? "#c2965c" : "#b88852"), z(a, 0, .06 + c * .051, o * .115, .26, .039, .021, "#c09862");
    for (let c of [-1, 1]) z(a, o * .115, .1, c * .1, .025, .2, .025, "#d0a66e");
  }
  if (r) for (let o = 0; o < 6; o++) pt(a, -.075 + o % 3 * .073, .19, Math.floor(o / 3) * .09 - .04, .045, .043, .043, o % 2 ? "#e0ae49" : "#c85d3d", 0);
  return a;
}

function xs(s, t, e, n, i = .4, r = .065, a = 0) {
  let o = ft(s, t, e, n, 1, a),
    c = gt(o, 0, 0, 0, r, i, "#815b3c", 8);
  c.rotation.x = Math.PI / 2;
  for (let l of [-1, 1]) {
    let h = gt(o, 0, 0, l * (i / 2 + .002), r * .86, .009, "#d9b57d", 8);
    h.rotation.x = Math.PI / 2;
    let u = vt(o, new H.TorusGeometry(r * .51, .004, 3, 8), "#ac824e", 0, 0, l * (i / 2 + .008));
    pt(o, 0, 0, l * (i / 2 + .013), r * .13, r * .13, .004, "#9d7849", 0);
  }
  return o;
}

function $s(s, t, e, n, i = 1) {
  let r = ft(s, t, e, n, i),
    a = "#56615a";
  gt(r, 0, .01, 0, .052, .032, a, 6), gt(r, 0, .094, 0, .043, .14, Tt("#f4c976", {
    emissive: "#e99833",
    emissiveIntensity: .35,
    roughness: .62
  }), 6), Kt(r, 0, .184, 0, .065, .054, a, 6, .021);
  for (let c = 0; c < 4; c++) {
    let l = c * pe / 4;
    it(r, [Math.cos(l) * .043, .02, Math.sin(l) * .043], [Math.cos(l) * .043, .16, Math.sin(l) * .043], .006, a, 3);
  }
  let o = vt(r, new H.TorusGeometry(.028, .005, 3, 9), a, 0, .224, 0);
  return r;
}

function M0(s, t, e, n, i, r = ["#3a5356", "#4b6667", "#526d68"]) {
  let a = t / 2;
  for (let o of [-1, 1]) for (let c = 0; c < 5; c++) for (let l = 0; l < 5; l++) {
    let h = (l / 5 + .008) * a,
      u = ((l + 1) / 5 - .008) * a,
      d = -e / 2 + c * e / 5 + .012,
      f = d + e / 5 - .024,
      p = i - (i - n) * h / a + .013,
      x = i - (i - n) * u / a + .013;
    vt(s, Jt([[o * h, p, d], [o * u, x, d], [o * h, p, f], [o * u, x, f]], [[0, 1, 2], [1, 3, 2]]), Tt(r[(c + l) % r.length], {
      side: H.DoubleSide
    }));
  }
  it(s, [0, i + .025, -e / 2 - .02], [0, i + .025, e / 2 + .02], .022, r[1], 5);
  for (let o of [-1, 1]) it(s, [o * a, n, -e / 2], [o * a, n, e / 2], .014, r[0], 4);
}

function b0(s, t, e, n, i = .38, r = .22, a = .26, o = ["#e5bc77", "#d7a76a", "#efc885"], c = 0) {
  let l = ft(s, t, e, n, 1, c),
    h = i * .6;
  for (let u = 0; u < 7; u++) {
    let d = u * Math.PI / 7 + .013,
      f = (u + 1) * Math.PI / 7 - .013,
      p = new H.Shape();
    [[Math.cos(d) * i, r + Math.sin(d) * i], [Math.cos(f) * i, r + Math.sin(f) * i], [Math.cos(f) * h, r + Math.sin(f) * h], [Math.cos(d) * h, r + Math.sin(d) * h]].forEach(([m, g], y) => y ? p.lineTo(m, g) : p.moveTo(m, g)), p.closePath(), vt(l, new H.ExtrudeGeometry(p, {
      depth: a,
      bevelEnabled: !1,
      steps: 1
    }), o[u % o.length], 0, 0, -a / 2);
  }
  for (let u of [-1, 1]) z(l, u * (i + h) / 2, r / 2, 0, i - h, r, a, o[1]), Ot(l, u * (i + h) / 2, .03, 0, (i - h) * .72, .07, a * .6, o[0]);
  return l;
}

function W1(s, t, e, n = 9, i = .28, r = "#a9ac8a", a = .057) {
  for (let o = 0; o < n; o++) {
    let c = Gn(0, pe),
      l = Gn(0, i),
      h = Gn(.018, .048);
    Ot(s, t + Math.cos(c) * l, a, e + Math.sin(c) * l, h, h * .4, h * .72, r);
  }
}

function X1(s, t, e, n, i = 1, r = "#c0e9d7") {
  let a = ft(s, t, e, n, i);
  for (let o = 0; o < 3; o++) {
    let c = [];
    for (let l = 0; l < 10; l++) {
      let h = -.85 + l * .19;
      c.push([Math.sin(h) * (.16 + o * .075), 0, Math.cos(h) * (.16 + o * .075)]);
    }
    Ro(a, c, .009, r);
  }
  return a;
}

function S0(s, t, e, n = .55, i = 0) {
  let r = ft(s, t, .065, e, n, i),
    a = "#d19a57",
    o = "#e1b475",
    c = "#956c3f";
  Ot(r, 0, .88, 0, .32, .37, .63, a, 1), Ot(r, 0, 1.16, -.28, .23, .27, .26, o), Ot(r, 0, 1.17, .23, .22, .29, .24, o);
  for (let l of [-1, 1]) for (let h of [-1, 1]) it(r, [l * .2, .9, h * .4], [l * .23, .38, h * .43], .073, a, 5, .048), it(r, [l * .23, .38, h * .43], [l * .25, .08, h * .4], .05, o, 5, .042), Ot(r, l * .25, .07, h * .43, .085, .045, .12, c);
  it(r, [0, .94, .48], [0, 1.49, .66], .18, a, 6, .12), it(r, [0, 1.44, .65], [0, 1.7, .61], .11, o, 6, .12), Ot(r, 0, 1.69, .73, .14, .155, .24, a), Ot(r, 0, 1.65, .94, .12, .09, .14, o);
  for (let l of [-1, 1]) Ot(r, l * .115, 1.84, .66, .048, .09, .048, a), Ot(r, l * .129, 1.74, .81, .023, .025, .022, "#392e29");
  return it(r, [0, .89, -.52], [0, .5, -.73], .028, a), Ot(r, 0, .48, -.74, .047, .08, .04, c), z(r, 0, 1.05, -.03, .61, .045, .33, "#b85446"), z(r, 0, 1.08, -.03, .52, .025, .12, "#e3b84e"), r;
}

function Wd(s, t, e, n, i = 1, r = 0) {
  let a = ft(s, t, e, n, i, r),
    o = "#f6f5e8",
    c = "#e6eef1",
    l = (u, d, f, p, x, m, g, y, S = 1) => {
      let v = Ot(u, d, f, p, x, m, g, y, S);
      return v.rotation.set(0, 0, 0), v;
    };
  l(a, 0, .35, -.04, .25, .245, .48, o), l(a, 0, .4, .24, .235, .255, .255, o);
  for (let u of [-1, 1]) for (let d of [-1, 1]) Kt(a, u * .15, .17, d * .28, .08, .29, c, 5, .065), l(a, u * .15, .055, d * .28 + .04, .1, .059, .14, o);
  let h = ft(a, 0, .48, .47);
  l(h, 0, 0, 0, .18, .17, .21, o), l(h, 0, -.025, .2, .11, .085, .15, c), l(h, 0, -.005, .32, .06, .044, .045, "#263b48");
  for (let u of [-1, 1]) l(h, u * .128, .13, -.04, .055, .06, .048, o), l(h, u * .149, .04, .12, .018, .021, .018, "#263543");
  return Ot(a, 0, .4, -.44, .065, .067, .075, o), ue(h, u => {
    h.rotation.y = Math.sin(u * .4 + t) * .11;
  }), a;
}

function q1(s, t, e, n, i = .75, r = 0) {
  let a = ft(s, t, e, n, i, r),
    o = "#547f96",
    c = "#aec6c9",
    l = [[-.83, .022], [-.52, .17], [0, .235], [.39, .18], [.76, .065], [.86, 0]],
    h = [],
    u = [];
  for (let p = 0; p < l.length - 1; p++) for (let x = 0; x < 8; x++) {
    let m = x * pe / 8,
      g = (x + 1) * pe / 8,
      y = (v, T) => [Math.cos(T) * l[v][1], Math.sin(T) * l[v][1] * .69, l[v][0]];
    h.push(y(p, m), y(p, g), y(p + 1, m), y(p, g), y(p + 1, g), y(p + 1, m));
    let S = new H.Color(x >= 4 ? c : o);
    for (let v = 0; v < 6; v++) u.push([S.r, S.g, S.b]);
  }
  vt(a, Jt(h, null, u), Tt("#ffffff", {
    vertexColors: !0,
    side: H.DoubleSide
  }));
  let d = Tt(o, {
    side: H.DoubleSide
  });
  vt(a, Jt([[0, .13, -.18], [0, .56, -.3], [0, .16, .27]], [[0, 1, 2]]), d);
  for (let p of [-1, 1]) {
    vt(a, Jt([[p * .1, 0, .21], [p * .59, -.06, -.26], [p * .19, -.05, -.3]], [[0, 1, 2]]), d), Ot(a, p * .116, .045, .59, .028, .028, .028, "#183440");
    for (let x = 0; x < 3; x++) it(a, [p * (.177 + x * .007), .035, .28 - x * .045], [p * (.168 + x * .009), -.035, .25 - x * .045], .007, "#33536a", 3);
  }
  let f = ft(a, 0, 0, -.76);
  return vt(f, Jt([[0, 0, .12], [0, .39, -.31], [0, .13, -.35], [0, 0, -.16], [0, -.23, -.36]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]]), d), ue(f, p => {
    f.rotation.y = Math.sin(p * 2.6 + t) * .28;
  }), a;
}

function Xd(s, t, e, n, i = "#ffbd50", r = 1) {
  let a = ft(s, t, e, n, r);
  Ot(a, 0, 0, 0, .105, .125, .235, i), vt(a, Jt([[0, 0, -.17], [0, .13, -.37], [0, -.13, -.37]], [[0, 1, 2]]), Tt(i, {
    side: H.DoubleSide
  })), Kt(a, 0, .12, -.02, .058, .15, i, 3);
  for (let o of [-1, 1]) Ot(a, o * .085, .02, .15, .025, .026, .023, "#173145");
  return a;
}

function Y1(s, t, e, n = "#e76562", i = 0) {
  let r = ft(s, t, .065, e, 1, .25);
  Ot(r, 0, 0, 0, .07, .04, .16, n), Ot(r, 0, .025, .2, .058, .058, .061, "#e6b190");
  let a = [];
  for (let o of [-1, 1]) {
    let c = ft(r, o * .068, 0, .075);
    it(c, [0, 0, 0], [o * .13, .01, .1], .026, "#e6b190", 5), a.push(c), it(r, [o * .035, 0, -.1], [o * .06, -.02, -.26], .025, "#e6b190", 5);
  }
  return ue(r, o => {
    r.position.z = e + Math.sin(o * .3 + i) * .15, a[0].rotation.y = Math.sin(o * 1.5 + i) * .65, a[1].rotation.y = -Math.sin(o * 1.5 + i) * .65;
  }), r;
}

function Z1(s, t, e, n = 0) {
  let i = ft(s, t, .1, e, .7, n),
    r = "#4e916b";
  i.name = "tractor", z(i, 0, .32, 0, .51, .18, 1.05, r), z(i, 0, .57, .28, .44, .3, .53, "#62a56d"), z(i, 0, .57, .565, .38, .22, .025, "#d4dbb8");
  for (let o = 0; o < 5; o++) z(i, -.135 + o * .066, .57, .583, .022, .16, .014, "#3c514b");
  z(i, 0, .29, .64, .56, .07, .1, "#344547"), z(i, 0, .55, -.26, .27, .1, .24, "#5b4539"), z(i, 0, .69, -.35, .27, .27, .07, "#574337"), it(i, [0, .4, -.04], [0, .74, .04], .025, "#384c42");
  let a = vt(i, new H.TorusGeometry(.12, .022, 5, 10), "#323e3b", 0, .75, .04);
  a.rotation.x = .7, gt(i, .13, .88, .39, .032, .38, "#48514a");
  for (let o of [-1, 1]) for (let c of [!1, !0]) {
    let l = c ? .18 : .3,
      h = gt(i, o * (c ? .31 : .34), l, c ? .38 : -.31, l, .17, "#303b3d", 10);
    h.rotation.z = Math.PI / 2;
    let u = gt(i, o * (c ? .402 : .433), l, c ? .38 : -.31, l * .51, .025, "#e5c361", 8);
    u.rotation.z = Math.PI / 2, c || z(i, o * .34, .61, -.29, .23, .04, .56, r);
  }
  return i;
}

function J1(s, t, e, n = 0) {
  let i = ft(s, t, .1, e, .62, n),
    r = "#c2b16e",
    a = "#333e3d";
  i.name = "jeep", z(i, 0, .38, 0, .64, .26, 1.14, r), z(i, 0, .6, .36, .61, .22, .46, "#cfbe80"), z(i, 0, .55, .61, .6, .25, .05, r);
  for (let l = 0; l < 5; l++) z(i, -.13 + l * .063, .54, .641, .026, .16, .015, a);
  for (let l of [-1, 1]) {
    let h = gt(i, l * .235, .57, .65, .067, .02, "#f5df9c", 8);
    h.rotation.x = Math.PI / 2;
    for (let u of [-.37, .36]) {
      let d = gt(i, l * .36, .27, u, .225, .14, a, 10);
      d.rotation.z = Math.PI / 2;
      let f = gt(i, l * .437, .27, u, .09, .018, "#9a9274", 8);
      f.rotation.z = Math.PI / 2;
    }
    it(i, [l * .28, .5, .08], [l * .28, 1.02, -.02], .026, a), it(i, [l * .28, .5, -.49], [l * .28, 1.02, -.49], .026, a), z(i, l * .3, .55, -.23, .06, .19, .56, r);
  }
  z(i, 0, 1.035, -.23, .68, .048, .61, "#ddd5ac");
  let o = z(i, 0, .83, .02, .51, .3, .02, Tt("#a5d3cf", {
    transparent: !0,
    opacity: .65,
    depthWrite: !1
  }));
  o.rotation.x = .1, z(i, 0, .84, .04, .023, .3, .025, a), z(i, 0, .28, .69, .73, .075, .08, "#657168");
  let c = gt(i, 0, .62, -.63, .2, .13, a, 10);
  return c.rotation.x = Math.PI / 2, z(i, -.29, .68, -.57, .15, .24, .11, "#a4563d"), i;
}

function w0(s, t, e, n = .85, i = 0) {
  let r = ft(s, t, .066, e, n, i),
    a = "#b98e60",
    o = "#e4cca0";
  pt(r, 0, .3, 0, .115, .15, .25, a), pt(r, 0, .35, .17, .08, .16, .1, a);
  for (let l of [-1, 1]) for (let h of [-1, 1]) it(r, [l * .075, .3, h * .16], [l * .075, .11, h * .18], .023, a, 5, .017), it(r, [l * .075, .11, h * .18], [l * .078, .025, h * .2], .016, "#816950", 4, .013), pt(r, l * .078, .021, h * .205, .027, .022, .036, "#4f4b40", 0);
  let c = ft(r, 0, .5, .23);
  pt(c, 0, 0, 0, .085, .088, .125, a), pt(c, 0, -.037, .1, .057, .045, .085, o), pt(c, 0, -.022, .17, .035, .024, .024, "#4a4940", 0);
  for (let l of [-1, 1]) {
    let h = pt(c, l * .065, .105, -.023, .032, .089, .028, a, 0);
    h.rotation.z = -l * .4, pt(c, l * .071, .015, .067, .014, .017, .014, "#343c37", 0), it(c, [l * .05, .073, -.028], [l * .075, .23, -.045], .014, "#957746", 4, .009), it(c, [l * .075, .2, -.044], [l * .14, .26, -.072], .009, "#ae915e", 4, .004), it(c, [l * .077, .16, -.045], [l * .035, .22, -.014], .008, "#ae915e", 4, .004);
  }
  return pt(r, 0, .36, -.25, .044, .067, .052, o, 0).rotation.x = -.3, ue(c, l => {
    c.rotation.y = Math.sin(l * .46 + t) * .15, c.rotation.x = Math.sin(l * .3) * .035;
  }), r;
}

function E0(s, t, e, n = .75, i = 0, r = !1) {
  let a = ft(s, t, .064, e, n, i),
    o = r ? "#dbb77d" : "#c87d43",
    c = r ? "#f2d9a7" : "#eddcc1";
  pt(a, 0, .15, 0, .086, .105, .19, o);
  for (let u of [-1, 1]) for (let d of [-1, 1]) it(a, [u * .054, .15, d * .12], [u * .06, .022, d * .12 + .018], .025, o, 5, .018), pt(a, u * .06, .021, d * .12 + .018, .023, .025, .036, r ? o : "#5b5046", 0);
  let l = ft(a, 0, .16, -.16);
  pt(l, 0, 0, -.17, .083, .073, .18, o), pt(l, 0, .007, -.3, .061, .057, .09, c);
  let h = ft(a, 0, .25, .19);
  pt(h, 0, 0, 0, .098, .085, .091, o, 0), pt(h, 0, -.025, .083, .059, .045, .08, c, 0), pt(h, 0, -.005, .149, .025, .021, .022, "#46463e", 0);
  for (let u of [-1, 1]) {
    let d = Kt(h, u * .066, .105, 0, .05, r ? .23 : .135, o, 3);
    d.rotation.z = -u * .1, Kt(h, u * .066, .105, .018, .027, r ? .17 : .09, "#e7bea6", 3), pt(h, u * .064, .015, .063, .013, .016, .013, "#303e37", 0);
  }
  return ue(l, u => {
    l.rotation.y = Math.sin(u * .85 + t) * .12;
  }), ue(h, u => {
    h.rotation.y = Math.sin(u * .42 + e) * .1;
  }), a;
}

function qd(s, t, e, n = .72, i = 0) {
  let r = ft(s, t, .066, e, n, i);
  pt(r, 0, .2, 0, .15, .16, .23, "#e9e2c4");
  for (let [o, c] of [[-.085, -.12], [.085, -.12], [-.095, .03], [.095, .04], [0, .13]]) pt(r, o, .26, c, .1, .1, .115, "#f3ebd4");
  for (let o of [-1, 1]) for (let c of [-1, 1]) it(r, [o * .086, .18, c * .14], [o * .09, .025, c * .14], .027, "#726d59", 5, .02);
  let a = ft(r, 0, .25, .23);
  pt(a, 0, 0, 0, .08, .1, .095, "#6d6a59");
  for (let o of [-1, 1]) pt(a, o * .09, .025, -.018, .068, .026, .034, "#8f8a70", 0), pt(a, o * .05, .035, .07, .014, .016, .011, "#272f2d", 0);
  return pt(r, 0, .22, -.24, .035, .038, .065, "#e8e0c0"), ue(a, o => {
    a.rotation.x = .08 + Math.sin(o * .5 + t) * .12;
  }), r;
}

function dh(s, t, e, n, i = "#e9b54a", r = 1) {
  let a = ft(s, t, e, n, r);
  pt(a, 0, 0, 0, .008, .009, .032, "#5d5849", 0);
  let o = [];
  for (let c of [-1, 1]) {
    let l = ft(a);
    vt(l, Jt([[0, 0, .025], [c * .068, .012, .085], [c * .102, 0, .047], [c * .053, 0, -.005], [c * .079, 0, -.052], [c * .028, 0, -.037], [0, 0, -.022]], [[0, 1, 2], [0, 2, 3], [0, 3, 6], [3, 4, 5], [3, 5, 6]]), Tt(i, {
      side: H.DoubleSide
    })), vt(l, Jt([[c * .032, .003, .032], [c * .06, .004, .063], [c * .078, .003, .04]], [[0, 1, 2]]), Tt("#f4d991", {
      side: H.DoubleSide
    })), o.push(l), ue(l, h => {
      l.rotation.z = c * (.22 + Math.sin(h * 8.3 + t) * .62);
    });
  }
  return ue(a, c => {
    a.position.set(t + Math.sin(c * .73 + t) * .17, e + Math.sin(c * 1.1 + n) * .06, n + Math.cos(c * .56 + n) * .14), a.rotation.y = c * .32;
  }), a;
}

function $1(s, t, e, n, i = 1) {
  let r = ft(s, t, e, n, i);
  it(r, [0, 0, -.075], [0, 0, .1], .009, "#62958b", 4, .006), pt(r, 0, .007, .1, .018, .014, .014, "#b6d9ad", 0);
  for (let a of [-1, 1]) for (let o of [-.027, .022]) vt(r, Jt([[0, 0, o], [a * .12, .01, o + .04], [a * .095, .01, o + .067]], [[0, 1, 2]]), Tt("#ccebe3", {
    side: H.DoubleSide,
    transparent: !0,
    opacity: .58,
    depthWrite: !1
  }));
  return ue(r, a => {
    r.position.set(t + Math.sin(a * .51) * .19, e + Math.sin(a * 2.6) * .021, n + Math.cos(a * .44) * .15), r.rotation.y = Math.sin(a * .37) * .5;
  }), r;
}

function T0(s, t, e, n, i = .75) {
  let r = ft(s, t, e, n, i);
  pt(r, 0, 0, 0, .24, .14, .33, "#79915c"), pt(r, 0, -.065, 0, .22, .055, .3, "#c6bd7d");
  for (let a = 0; a < 7; a++) {
    let o = a * pe / 6,
      c = a === 6 ? 0 : Math.cos(o) * .117,
      l = a === 6 ? 0 : Math.sin(o) * .185,
      h = a === 6 ? .148 : .111,
      u = Array.from({
        length: 6
      }, (f, p) => [c + Math.cos(p * pe / 6) * .079, h + p % 2 * .005, l + Math.sin(p * pe / 6) * .091]),
      d = [];
    for (let f = 0; f < 6; f++) d.push([c, h + .027, l], u[f], u[(f + 1) % 6]);
    vt(r, Jt(d), Tt(a % 2 ? "#b4af67" : "#8f9e59", {
      side: H.DoubleSide
    }));
  }
  pt(r, 0, -.012, .395, .079, .065, .118, "#9da86a");
  for (let a of [-1, 1]) {
    pt(r, a * .061, .012, .455, .013, .016, .014, "#2d4842", 0);
    for (let o of [!0, !1]) {
      let c = ft(r, a * .18, -.025, o ? .18 : -.21);
      vt(c, Jt([[0, 0, 0], [a * .25, -.015, o ? .02 : -.09], [a * .29, -.005, o ? -.08 : -.17], [a * .05, -.018, o ? -.13 : -.08]], [[0, 1, 2], [0, 2, 3]]), Tt("#8b9d66", {
        side: H.DoubleSide
      })), ue(c, l => {
        c.rotation.z = Math.sin(l * 1.2 + (o ? 0 : 1.8)) * a * .18, c.rotation.y = Math.sin(l * 1.2) * a * .13;
      });
    }
  }
  return Kt(r, 0, 0, -.35, .029, .12, "#8c9d66", 4).rotation.x = -Math.PI / 2, ue(r, a => {
    let o = a * .13 + 1.2;
    r.position.set(t + Math.sin(o) * .38, e + Math.sin(a * .65) * .038, n + Math.cos(o) * .37), r.rotation.y = Math.atan2(Math.cos(o), -Math.sin(o));
  }), r;
}

function Yd(s, t, e, n, i = .8, r = 0) {
  let a = ft(s, t, e, n, i, r);
  pt(a, 0, .105, -.03, .155, .123, .3, "#8aabb4"), pt(a, 0, .17, .17, .119, .13, .13, "#9eb8bd");
  let c = ft(a, 0, .235, .24);
  pt(c, 0, 0, 0, .112, .1, .117, "#a5bec1"), pt(c, 0, -.023, .095, .072, .045, .055, "#d3ddd5"), pt(c, 0, -.006, .135, .032, .025, .028, "#384d55", 0);
  for (let l of [-1, 1]) {
    pt(c, l * .073, .03, .076, .015, .018, .013, "#263d48", 0);
    for (let d = 0; d < 3; d++) it(c, [l * .035, -.027, .117], [l * .14, -.012 - d * .021, .128], .0035, "#657d85", 3);
    let h = pt(a, l * .166, .048, .095, .11, .023, .065, "#718e9f", 0);
    h.rotation.y = l * .6;
    let u = pt(a, l * .062, .054, -.32, .068, .025, .112, "#7d9ba7", 0);
    u.rotation.y = l * .4;
  }
  return ue(c, l => {
    c.rotation.y = Math.sin(l * .32 + t) * .12, c.rotation.x = Math.sin(l * .48) * .035;
  }), a;
}

function K1(s, t, e, n, i = 1) {
  let r = ft(s, t, e, n, i, 1.2),
    a = "#d9835b";
  pt(r, 0, .037, 0, .075, .047, .06, a, 0);
  for (let o of [-1, 1]) {
    for (let c = 0; c < 3; c++) {
      let l = -.045 + c * .035;
      it(r, [o * .048, .035, l], [o * .1, .045, l - .017], .008, a, 4), it(r, [o * .1, .045, l - .017], [o * .128, 0, l - .01], .006, a, 4);
    }
    it(r, [o * .044, .04, .04], [o * .082, .065, .1], .013, a, 5), pt(r, o * .077, .066, .119, .032, .024, .033, "#eaa579", 0), it(r, [o * .035, .066, .035], [o * .036, .093, .042], .005, "#be7859", 3), pt(r, o * .036, .096, .045, .009, .011, .009, "#3b514f", 0);
  }
  return r;
}

function A0(s, t, e, n, i = .75, r = 0) {
  let a = ft(s, t, e, n, i);
  pt(a, 0, 0, 0, .03, .025, .083, "#f2efdc", 0), pt(a, 0, .022, .077, .023, .021, .03, "#f4f0dd", 0);
  let o = Kt(a, 0, .016, .112, .009, .04, "#d9af58", 4);
  o.rotation.x = Math.PI / 2;
  for (let c of [-1, 1]) {
    let l = ft(a);
    vt(l, Jt([[0, 0, .023], [c * .17, .026, .041], [c * .32, -.012, -.003], [c * .16, .019, -.037], [0, 0, -.028]], [[0, 1, 3], [1, 2, 3], [0, 3, 4]]), Tt("#e6e9df", {
      side: H.DoubleSide
    })), vt(l, Jt([[c * .2, .024, .025], [c * .32, -.009, -.003], [c * .21, .02, -.023]], [[0, 1, 2]]), Tt("#849b9e", {
      side: H.DoubleSide
    })), ue(l, h => {
      l.rotation.z = Math.sin(h * 1.8 + r) * .16 * c;
    });
  }
  return ue(a, c => {
    a.position.set(t + Math.sin(c * .18 + r) * .2, e + Math.sin(c * .68 + r) * .05, n + Math.cos(c * .17 + r) * .18), a.rotation.y = .7 + Math.sin(c * .18 + r) * .4;
  }), a;
}

function j1(s, t = 1, e = "#d87655") {
  let n = ft(s, 0, 0, 0, t);
  gt(n, 0, .1, 0, .031, .2, "#efdeba", 5), Kt(n, 0, .2, 0, .105, .11, e, 7, .027);
  for (let i = 0; i < 4; i++) {
    let r = i * 2.1;
    pt(n, Math.cos(r) * .052, .231, Math.sin(r) * .05, .016, .006, .013, "#f4dfb5", 0);
  }
  return n;
}

function kS(s, t = 1) {
  for (let e = 0; e < 3; e++) z(s, 0, .045 + e * .048, .3 - e * .15, t - .08 * e, .075, .25, e % 2 ? "#a7a99a" : "#c0bb9f");
}

function Q1(s, t = "#cfb37b") {
  gt(s, 0, .43, 0, .043, .86, "#82643e", 6), vt(s, Jt([[-.27, .67, .045], [.15, .67, .045], [.3, .77, .045], [.15, .87, .045], [-.27, .87, .045]], [[0, 1, 2], [0, 2, 3], [0, 3, 4]]), Tt(t, {
    side: H.DoubleSide
  }));
  for (let e of [-.18, .12]) pt(s, e, .77, .052, .011, .011, .008, "#675842", 0);
}

function VS(s) {
  z(s, 0, .08, 0, 1.75 + .16, .16, 1.55 + .18, "#697a71"), z(s, 0, .61, 0, 1.75, 1.06, 1.55, "#a57246");
  for (let c = 0; c < 8; c++) {
    let l = .2 + c * .13;
    z(s, 0, l, 1.55 / 2 + .012, 1.75, .019, .014, "#805637");
    for (let h of [-1, 1]) z(s, h * (1.75 / 2 + .015), l, 0, .014, .019, 1.55, "#805637"), z(s, h * (1.75 / 2 - .025), l + .025, 1.55 / 2 + .035, .15, .077, .1, c % 2 ? "#c8975c" : "#b68852"), z(s, h * (1.75 / 2 - .025), l + .025, -1.55 / 2 - .025, .15, .077, .1, "#bc8c57");
  }
  Zr(s, 2.06, 1.9, 1.19, 1.87, "#466966"), M0(s, 2.06, 1.9, 1.19, 1.87, ["#345b57", "#426e64", "#548677"]), z(s, -.12, .49, .802, .42, .83, .057, "#654a34");
  for (let c = 0; c < 4; c++) z(s, -.28 + c * .1, .49, .838, .008, .75, .015, "#89663f");
  pt(s, .027, .48, .86, .025, .023, .015, "#e4bf67", 0), Js(s, -.59, .7, .814, .3, .35), Js(s, .52, .7, .814, .34, .35);
  let n = ft(s, .887, .02, -.1, 1, Math.PI / 2);
  Js(n, 0, .68, 0, .34, .35), z(s, .52, .465, .91, .45, .09, .18, "#704e35");
  for (let c = 0; c < 4; c++) ms(s, .365 + c * .1, .92, c % 2 ? "#e9be63" : "#d97863", .58, .51);
  z(s, 0, .12, 1.08, 1.89, .1, .51, "#bc9663");
  for (let c = 0; c < 12; c++) z(s, -.86 + c * .156, .178, 1.08, .009, .015, .47, "#8d6742");
  for (let c of [-1, 1]) z(s, c * .82, .72, 1.24, .076, 1.22, .076, "#c19762"), it(s, [c * .82, 1.16, 1.24], [c * .55, 1.37, 1.24], .025, "#d8b27a", 4);
  let i = z(s, 0, 1.31, 1.15, 1.94, .075, .65, "#467269");
  i.rotation.x = .15, kS(ft(s, 0, 0, 1.47), .78), $s(s, -.82, .66, 1.29, 1.15), z(s, .48, 1.83, -.4, .25, .68, .27, "#927f72");
  for (let c = 0; c < 5; c++) z(s, .48, 1.55 + c * .13, -.259, .25, .018, .012, "#c0ad90");
  z(s, .48, 2.17, -.4, .32, .08, .34, "#b6a78f"), gs(s, .97, .08, .69, 1.25);
  for (let c = 0; c < 5; c++) xs(s, -1.02, .11 + (c > 2 ? .13 : 0), -.28 + c % 3 * .15, .62, .08, Math.PI / 2);
  let r = ft(s, .48, 2.18, -.4),
    a = new H.InstancedMesh(new H.IcosahedronGeometry(1, 0), Tt("#bed2c2", {
      transparent: !0,
      opacity: .27,
      depthWrite: !1
    }), 6);
  r.add(a);
  let o = new H.Object3D();
  ue(r, c => {
    for (let l = 0; l < 6; l++) {
      let h = (c * .13 + l / 6) % 1;
      o.position.set(Math.sin(h * 4 + c * .2) * h * .23, h * 1.25, Math.cos(h * 3) * h * .13), o.rotation.set(h, h * .7, 0), o.scale.setScalar(.07 + h * .15), o.updateMatrix(), a.setMatrixAt(l, o.matrix);
    }
    a.instanceMatrix.needsUpdate = !0;
  });
}

function tx(s, t = 1.55, e = .76, n = !1) {
  for (let i = 0; i < 12; i++) {
    let r = -t / 2 + t * i / 11,
      a = .13 + Math.cos(r / t * Math.PI) * .1;
    z(s, 0, a, r, e, .061, t / 11 * .86, i % 3 ? "#c79b61" : "#d8b77f");
  }
  for (let i of [-1, 1]) {
    it(s, [i * (e / 2 - .055), .08, -t / 2], [i * (e / 2 - .055), .08, t / 2], .054, "#7d6346", 5);
    for (let r of [-t / 2, 0, t / 2]) gt(s, i * (e / 2 + .025), .43, r, .03, .82, "#946c42", 5);
    for (let r of [.53, .75]) it(s, [i * (e / 2 + .025), r, -t / 2], [i * (e / 2 + .025), r, t / 2], n ? .018 : .032, n ? "#d5c49a" : "#b5935f", 5);
  }
}

function GS(s) {
  let t = Tt("#513c36", {
    emissive: "#af3312",
    emissiveIntensity: .16
  });
  gt(s, 0, .026, 0, .33, .055, t, 10);
  for (let c = 0; c < 10; c++) {
    let l = c * pe / 10;
    Ot(s, Math.cos(l) * .38, .1, Math.sin(l) * .38, .1, .1, .083, c % 2 ? "#929b87" : "#778a7c");
  }
  xs(s, 0, .115, 0, .57, .073, .7), xs(s, 0, .18, 0, .53, .068, -.75);
  let e = ft(s, 0, .19, 0),
    n = Tt("#f48637", {
      emissive: "#ff5c13",
      emissiveIntensity: .75
    }),
    i = Tt("#ffd266", {
      emissive: "#ffba33",
      emissiveIntensity: .75
    });
  for (let c = 0; c < 5; c++) {
    let l = c * 2.4;
    Kt(e, Math.cos(l) * .11, .2 + Math.sin(l) * .04, Math.sin(l) * .11, .12, .48, n, 5);
  }
  Kt(e, 0, .16, .055, .15, .37, i, 5), Je(e), e.userData.dynamic = !0;
  let r = new H.InstancedMesh(new H.IcosahedronGeometry(.017, 0), i, 10);
  s.add(r), r.userData.dynamic = !0;
  let a = new H.Object3D(),
    o = {
      lit: !1
    };
  return ue(e, c => {
    if (e.visible = o.lit, r.visible = o.lit, !!o.lit) {
      e.scale.set(1 + Math.sin(c * 5.3) * .1, .87 + Math.sin(c * 7) * .15, 1 + Math.sin(c * 4.1) * .09), e.rotation.y = Math.sin(c * 2) * .1;
      for (let l = 0; l < 10; l++) {
        let h = (c * .32 + l / 10) % 1;
        a.position.set(Math.sin(l * 2.4 + h * 2) * h * .3, .38 + h * .9, Math.cos(l * 2.4 + h) * h * .3), a.scale.setScalar(1 - h * .8), a.updateMatrix(), r.setMatrixAt(l, a.matrix);
      }
      r.instanceMatrix.needsUpdate = !0;
    }
  }), {
    flames: e,
    activate() {
      return o.lit = !o.lit, t.emissiveIntensity = o.lit ? .7 : .16, o.lit ? "A warm campfire crackles to life." : "You bank the fire and leave a ring of warm embers.";
    }
  };
}

function R0(s, t = "#d59b58", e = 1) {
  let n = ft(s, 0, 0, 0, e),
    i = .82,
    r = .67,
    a = 1.03;
  vt(n, Jt([[-i, 0, -r], [i, 0, -r], [0, a, -r], [-i, 0, r], [i, 0, r], [0, a, r]], [[0, 3, 5], [0, 5, 2], [2, 5, 4], [2, 4, 1], [0, 2, 1], [3, 4, 5]]), t), vt(n, Jt([[-.46, .01, r + .015], [.46, .01, r + .015], [0, .79, r + .015]], [[0, 1, 2]]), Tt("#514d46", {
    side: H.DoubleSide
  }));
  for (let o of [-1, 1]) it(n, [o * i, .025, r + .03], [0, a + .02, r + .03], .016, "#eed4a0", 4);
  it(n, [0, a + .045, -r - .16], [0, a + .045, r + .16], .022, "#776448", 5);
  for (let o of [-1, 1]) for (let c of [-r, r]) it(n, [o * i * .65, a * .35, c], [o * 1.1, .02, c * 1.36], .009, "#d7c39b", 3), it(n, [o * 1.1, .02, c * 1.36], [o * 1.13, .16, c * 1.4], .016, "#827b68", 4);
  return n;
}

function HS(s) {
  let t = "forest",
    e = (r, a, o, c) => s.place(t, r, a, o, c);
  s.addPath(t, [[-4.4, 1.8], [-2.7, 1.3], [-1.4, .45], [0, 0], [.7, .65], [1.3, 1.85], [3.8, 2.7]], .64, "#b6ac73"), s.addPath(t, [[-1.6, 0], [-2, -.25], [-2.1, -.8]], .75, "#c0b07c"), s.addPath(t, [[1.15, -3.7], [1.7, -2.7], [1.7, -1.7], [2.15, -.5], [2.4, .7], [2.1, 1.8], [2.9, 3], [3.7, 4.2]], .65, "#48b7ae", .05), s.addPath(t, [[1.19, -3.6], [1.76, -2.7], [1.76, -1.7], [2.22, -.5], [2.47, .7], [2.18, 1.8], [2.97, 3], [3.74, 4.1]], .13, "#8edbcb", .065), e(-2.1, -2, VS, {
    heading: .12
  }), s.addCollider(t, -2.1, -2, 1.02), e(.3, -3.85, r => {
    Ot(r, -.38, .96, -.04, 1, 1.47, .82, "#87938a"), Ot(r, .4, .92, .03, .8, 1.72, .74, "#a7aaa0"), Kt(r, .3, 2.4, -.07, .35, .53, "#dde4d6", 5), Ot(r, -.49, 1.77, -.1, .38, .41, .37, "#d1d8ca"), Ot(r, .75, .3, .26, .47, .4, .54, "#82968c");
    let a = Tt("#8addd4", {
      emissive: "#359d9b",
      emissiveIntensity: .09,
      transparent: !0,
      opacity: .8,
      side: H.DoubleSide,
      depthWrite: !1
    });
    Ro(r, [[.61, 1.37, .48], [.65, 1.12, .51], [.69, .72, .57], [.72, .3, .62], [.87, .09, .67]], [.25, .25, .22, .24, .39], a);
    let o = ft(r),
      c = new H.InstancedMesh(new H.CylinderGeometry(.012, .009, .11, 3), Tt("#d8fff2", {
        transparent: !0,
        opacity: .7,
        depthWrite: !1
      }), 12);
    o.add(c);
    let l = new H.Object3D();
    ue(o, h => {
      for (let u = 0; u < 12; u++) {
        let d = (h * .67 + u / 12) % 1;
        l.position.set(.6 + u % 3 * .063 + d * .14, 1.35 - d * 1.17, .535 + d * .13), l.scale.setScalar(1), l.updateMatrix(), c.setMatrixAt(u, l.matrix);
      }
      c.instanceMatrix.needsUpdate = !0;
    });
  }), s.addCollider(t, .3, -3.85, 1), e(2.25, .85, r => tx(r, 1.53, .85), {
    heading: Math.PI / 2 - .22
  });
  let n = e(.3, 1.25, r => {
    let a = GS(r);
    r.userData.activate = a.activate, r.userData.flames = a.flames;
  });
  s.addLandmark({
    id: "forest-campfire",
    biome: t,
    label: "Woodland campfire",
    action: "Tend the fire",
    description: "Warm a quiet clearing beneath the pines.",
    x: .3,
    z: 1.25,
    radius: 2.25,
    object: n.userData.flames,
    activate: n.userData.activate
  }), e(-.65, 1.58, r => xs(r, 0, .17, 0, .95, .13, 1.15)), e(.72, 2.12, r => xs(r, 0, .17, 0, 1, .13, -.2)), e(-1.42, 2.25, r => {
    R0(r, "#cc8c55", .9), $s(r, .77, .05, .59, .9);
  }), s.addCollider(t, -1.42, 2.25, .65), e(-2.55, 1.55, r => {
    wn(r, 0, .03, 0, 1.4, !0), qi(r, .34, .04, .04, .12);
  }), e(-3.48, .4, r => {
    Q1(r), j1(ft(r, .25, 0, .1), 1.2);
  }), [[-4.3, -.7, 2.15], [-4, -2.2, 2.3], [-3.6, -3.5, 1.95], [-2.5, -4.25, 2.05], [-1.1, -4.65, 2.45], [1.4, -4.6, 1.6], [2.65, -3.8, 2.2], [3.2, -2.55, 1.65], [3.4, -1.2, 2.3], [4.05, .1, 1.85], [4.45, 1.75, 2.05], [3.6, 3.2, 1.65], [1.3, 3.55, 1.7], [.1, 4.12, 2.18], [-1.6, 4.1, 1.8], [-3, 3.05, 2.05], [-3.95, 1.75, 1.65], [-3.1, -.3, 1.55]].forEach(([r, a, o], c) => {
    e(r, a, l => qr(l, 0, 0, o, ["#357b55", "#318e60", "#4b9868", "#266c4d"][c % 4], 0)), s.addCollider(t, r, a, .19);
  }), e(-3.5, .8, r => w0(r, 0, 0, 1.75, .9)), e(-3.4, 2.15, r => w0(r, 0, 0, 1.22, 2.3)), e(3.3, -.3, r => E0(r, 0, 0, 1.5, -1.6));
  for (let r = 0; r < 36; r++) {
    let a = r % 6,
      o = [[-3.4, 1], [-.3, 3], [3.2, -2.4], [-3.6, -3], [1, -2.4], [2.7, 2.8]],
      c = o[a][0] + s.rand(-.45, .45),
      l = o[a][1] + s.rand(-.4, .4);
    e(c, l, h => r % 5 === 0 ? j1(h, s.rand(.7, 1.2), r % 2 ? "#d18e56" : "#c75c4f") : r % 3 === 0 ? Jr(h, 0, 0, .85, 0) : ms(h, 0, 0, ["#e8c477", "#d8e6be", "#a29ccc"][r % 3], s.rand(.7, 1.25), 0));
  }
  for (let r = 0; r < 17; r++) {
    let a = r / 16,
      o = 1.45 + 1.5 * a + Math.sin(a * 7) * .4,
      c = -3.1 + a * 6.3;
    e(o + (r % 2 ? .47 : -.44), c, l => Ot(l, 0, .06, 0, s.rand(.06, .14), .065, s.rand(.08, .18), r % 2 ? "#acc2aa" : "#88a99a"));
  }
  e(.4, 2.8, r => dh(r, 0, .54, 0, "#e5c066", 1.7)), e(2.7, .3, r => $1(r, 0, .39, 0, 1.65)), e(-.7, -.95, r => {
    let a = ft(r, 0, 3.2, 0);
    for (let l = 0; l < 6; l++) pt(a, -.48 + l * .19, .08 + Math.sin(l) * .08, Math.sin(l * 2) * .11, .27, .23, .25, l % 2 ? "#c9dce0" : "#e2e7df");
    let o = new H.InstancedMesh(new H.CylinderGeometry(.006, .004, .15, 3), Tt("#9abfd0", {
      transparent: !0,
      opacity: .52,
      depthWrite: !1
    }), 25);
    a.add(o);
    let c = new H.Object3D();
    ue(a, l => {
      a.position.x = Math.sin(l * .18) * .15;
      for (let h = 0; h < 25; h++) {
        let u = (l * .55 + h * .219) % 1;
        c.position.set(Math.sin(h * 3.18) * .58 - u * .1, -.2 - u * 2.65, Math.cos(h * 2.37) * .31), c.rotation.z = -.06, c.scale.setScalar(1), c.updateMatrix(), o.setMatrixAt(h, c.matrix);
      }
      o.instanceMatrix.needsUpdate = !0;
    });
  });
}

function WS(s) {
  let t = "#b94f43",
    e = "#f1dfb6";
  z(s, 0, .075, 0, 2.06, .15, 1.71, "#918671"), z(s, 0, .71, 0, 1.98, 1.29, 1.65, t);
  for (let n = 0; n < 15; n++) {
    let i = -.94 + n * .134;
    z(s, i, .7, .836, .014, 1.2, .023, n % 3 ? "#d06b52" : "#a2443b");
  }
  for (let n of [-1, 1]) for (let i = 0; i < 12; i++) z(s, n * 1.005, .7, -.76 + i * .139, .022, 1.18, .014, "#cf6650");
  Zr(s, 2.25, 1.94, 1.38, 2.14, "#405b5b"), M0(s, 2.25, 1.94, 1.38, 2.14, ["#345254", "#496760", "#607a68"]);
  for (let n of [-1, 1]) z(s, n * .94, .72, .86, .11, 1.38, .05, e), z(s, n * .255, .61, .87, .49, 1.08, .045, "#a23f38"), z(s, n * .48, .61, .904, .053, 1.06, .034, e), Ln(s, [n * .46, .11, .918], [n * .04, 1.09, .918], .035, .035, e);
  z(s, 0, 1.17, .904, 1.08, .075, .05, e), z(s, 0, .6, .905, .045, 1.1, .033, e), z(s, 0, 1.37, .86, 2.06, .085, .06, e), Js(s, 0, 1.67, .856, .32, .3), z(s, 0, 1.98, 0, .46, .42, .48, "#c55e46"), Zr(ft(s, 0, 0, 0), .63, .66, 2.19, 2.45, "#567268");
  for (let n of [-.16, .16]) z(s, n, 2.02, .249, .08, .19, .025, e);
  it(s, [0, 2.45, 0], [0, 2.77, 0], .014, "#566561", 4), vt(s, Jt([[-.2, 2.68, 0], [.2, 2.68, 0], [.11, 2.76, 0], [.11, 2.6, 0]], [[0, 1, 2], [0, 3, 1]]), Tt("#c4b578", {
    side: H.DoubleSide
  })), gs(s, 1.15, .06, .45, 1.25), wn(s, -1.17, .03, .66, 1.2, !0);
  for (let n = 0; n < 4; n++) z(s, -.56 + n * .35, .125, 1.23, .33, .15, .51, "#c4b990");
}

function XS(s) {
  Kt(s, 0, .89, 0, .44, 1.78, "#ded8b9", 8, .27);
  for (let e = 0; e < 5; e++) for (let n = 0; n < 4; n++) {
    let i = n * pe / 4 + e % 2 * .5,
      r = ft(s, Math.sin(i) * (.417 - e * .024), .25 + e * .29, Math.cos(i) * (.417 - e * .024), 1, i);
    z(r, 0, 0, 0, .22, .024, .024, "#b3af92");
  }
  Kt(s, 0, 1.98, 0, .49, .52, "#a06043", 8), Js(s, 0, 1.1, .344, .17, .23);
  let t = ft(s, 0, 1.8, .46);
  gt(t, 0, 0, .015, .1, .15, "#a47c48", 8).rotation.x = Math.PI / 2;
  for (let e = 0; e < 4; e++) {
    let n = ft(t);
    n.rotation.z = e * Math.PI / 2, z(n, .024, .52, 0, .054, 1.18, .045, "#8b724e"), z(n, .13, .71, .008, .24, .61, .025, "#f2e7c6");
    for (let i = 0; i < 5; i++) z(n, .13, .45 + i * .125, .033, .26, .014, .022, "#baa57d");
    z(n, .244, .71, .035, .018, .65, .021, "#aa9270");
  }
  Je(t), ue(t, e => {
    t.rotation.z = e * .25;
  });
}

function C0(s, t = 1, e = .62) {
  for (let n of [-1, 1]) z(s, n * t / 2, e / 2, 0, .075, e, .075, "#efdfb7"), Kt(s, n * t / 2, e + .035, 0, .053, .09, "#e4cfa6", 4);
  for (let n of [.23, .47]) z(s, 0, n, 0, t, .048, .04, "#dbcaa3");
}

function qS(s, t = 1) {
  let e = ft(s, 0, 0, 0, t);
  it(e, [0, 0, 0], [.035, .66, 0], .018, "#709343", 5);
  for (let i of [-1, 1]) vt(e, Jt([[.008, .27, 0], [i * .18, .42, .01], [i * .07, .26, .022]], [[0, 1, 2]]), Tt("#72a14a", {
    side: H.DoubleSide
  }));
  let n = ft(e, .035, .69, 0, 1, .25);
  n.rotation.x = .18, gt(n, 0, 0, .015, .089, .036, "#79593b", 10).rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    let r = i * pe / 10;
    pt(n, Math.cos(r) * .118, Math.sin(r) * .118, .01, .065, .031, .018, i % 2 ? "#f1bb47" : "#ffda62", 0).rotation.z = r;
  }
}

function YS(s, t = 0) {
  let e = ft(s);
  if (t === 0) {
    pt(e, 0, .13, 0, .16, .14, .16, "#83ad59");
    for (let n = 0; n < 6; n++) {
      let i = n * pe / 6;
      pt(e, Math.cos(i) * .105, .11, Math.sin(i) * .105, .1, .088, .074, n % 2 ? "#6a9c4c" : "#a0be6b", 0).rotation.y = -i;
    }
  } else if (t === 1) {
    Kt(e, 0, .1, 0, .078, .23, "#e6943d", 6, .014);
    for (let n = 0; n < 5; n++) {
      let i = n * pe / 5;
      vt(e, Jt([[0, .16, 0], [Math.sin(i) * .1, .41, Math.cos(i) * .1], [Math.sin(i + .5) * .06, .19, Math.cos(i + .5) * .06]], [[0, 1, 2]]), Tt(n % 2 ? "#8daf52" : "#619348", {
        side: H.DoubleSide
      }));
    }
  } else {
    it(e, [0, 0, 0], [0, .49, 0], .012, "#8b7653", 4), pt(e, 0, .26, 0, .16, .2, .15, "#5f964e", 0);
    for (let n = 0; n < 4; n++) {
      let i = n * 2.4;
      pt(e, Math.sin(i) * .12, .17 + n % 2 * .13, Math.cos(i) * .13, .05, .05, .046, n % 2 ? "#e66e45" : "#d65b3d", 0);
    }
  }
  return Je(e), e.userData.dynamic = !0, e;
}

function ZS(s) {
  let t = "farm",
    e = (a, o, c, l) => s.place(t, a, o, c, l);
  s.addPath(t, [[-4.1, .7], [-2.4, .75], [-.95, .42], [0, 0], [1.05, -.37], [2.4, -1.3], [3.5, -2.3]], .78, "#c5b17a"), s.addPath(t, [[-1.6, .65], [-1.65, -.6], [-1.65, -1.1]], .85, "#ccb780"), s.addPath(t, [[.1, .6], [.1, 2], [.1, 3.7]], .58, "#c8b980"), e(-1.75, -2.65, WS, {
    heading: .03
  }), s.addCollider(t, -1.75, -2.65, 1.13), e(2.52, -2.7, XS, {
    heading: -.14
  }), s.addCollider(t, 2.52, -2.7, .49), e(.47, -2.75, a => {
    gt(a, 0, .69, 0, .39, 1.38, "#a8bab1", 12), Kt(a, 0, 1.48, 0, .44, .35, "#d8d9bc", 12);
    for (let o of [.3, .75, 1.2]) {
      let c = vt(a, new H.TorusGeometry(.395, .012, 4, 12), "#7c998f", 0, o, 0);
      c.rotation.x = Math.PI / 2;
    }
    z(a, .11, .77, .383, .03, 1.36, .03, "#637d76"), z(a, -.11, .77, .383, .03, 1.36, .03, "#637d76");
    for (let o = 0; o < 8; o++) z(a, 0, .17 + o * .16, .413, .23, .021, .025, "#809c8e");
  }), s.addCollider(t, .47, -2.75, .42), e(-.72, -.87, a => {
    Z1(a, 0, 0, 1.2).scale.multiplyScalar(1.6);
  }), s.addCollider(t, -.72, -.87, .44), e(-3.12, -.46, a => {
    for (let o = 0; o < 3; o++) {
      let c = gt(a, o % 2 * .52, .24 + Math.floor(o / 2) * .44, 0, .24, .44, o % 2 ? "#d2b664" : "#e2c674", 9);
      c.rotation.x = Math.PI / 2;
      for (let l of [-.23, .23]) {
        let h = vt(a, new H.TorusGeometry(.14, .014, 4, 9), "#b18c45", o % 2 * .52, .24 + Math.floor(o / 2) * .44, l);
      }
    }
  });
  let n = [];
  [.87, 1.52, 2.17, 2.82].forEach((a, o) => {
    s.addPath(t, [[a, 1.1], [a, 3.5]], .45, "#846540");
    for (let c = 0; c < 6; c++) {
      let l = 1.22 + c * .43;
      e(a, l, h => {
        let u = YS(h, o % 3);
        u.scale.setScalar(.46), n.push(u);
      });
    }
  });
  let r = e(.6, .91, a => {
    gt(a, 0, .035, 0, .29, .07, "#b4aa89", 8), gt(a, 0, .43, 0, .09, .82, "#4e8372", 7), Kt(a, 0, .92, 0, .125, .17, "#749c80", 7, .05), it(a, [0, .71, 0], [.24, .71, 0], .052, "#6b957c", 6), it(a, [.24, .71, 0], [.24, .6, 0], .048, "#6b957c", 6);
    let o = ft(a, 0, .85, 0);
    it(o, [-.03, 0, 0], [-.3, -.08, 0], .023, "#526d5e", 5), pt(o, -.3, -.08, 0, .04, .035, .045, "#9f895e", 0);
    let c = ft(a, .31, 0, .28);
    gt(c, 0, .12, 0, .12, .22, "#77a698", 8), it(c, [.07, .06, 0], [.27, .26, 0], .035, "#6c988a", 6, .06);
    let l = vt(c, new H.TorusGeometry(.097, .018, 4, 10), "#679083", -.11, .2, 0);
    l.rotation.y = Math.PI / 2;
    let h = new H.InstancedMesh(new H.IcosahedronGeometry(.023, 0), Tt("#c6f5df", {
      emissive: "#53b9a5",
      emissiveIntensity: .1
    }), 20);
    a.add(h), h.userData.dynamic = !0;
    let u = {
        goal: .46,
        current: .46,
        watering: 0,
        last: 0
      },
      d = new H.Object3D();
    ue(o, f => {
      let p = Math.min(.06, Math.max(0, f - u.last));
      if (u.last = f, u.watering = Math.max(0, u.watering - p), u.current += (u.goal - u.current) * Math.min(1, p * 1.6), n.forEach((x, m) => x.scale.setScalar(u.current * (.94 + Math.sin(m * 2) * .06))), o.rotation.z = u.watering ? Math.sin(f * 6) * .37 : 0, h.visible = u.watering > 0, h.visible) {
        for (let x = 0; x < 20; x++) {
          let m = (f * .64 + x / 20) % 1;
          d.position.set(.22 + m * (1 + x % 4 * .49), .61 + Math.sin(m * Math.PI) * .48 - m * .57, .08 + x % 6 * .23 * m), d.scale.setScalar(.6 + Math.sin(m * Math.PI) * .6), d.updateMatrix(), h.setMatrixAt(x, d.matrix);
        }
        h.instanceMatrix.needsUpdate = !0;
      }
    }), a.userData.handle = o, a.userData.activate = () => {
      let f = u.goal < .8;
      return u.goal = f ? 1.22 : .46, u.watering = f ? 5 : 0, f ? "Fresh water brings the vegetable rows into bloom." : "You harvest the garden. New seedlings are ready to grow.";
    };
  });
  s.addLandmark({
    id: "farm-garden",
    biome: t,
    label: "Kitchen garden",
    action: "Water / harvest",
    description: "Work the pump and help the vegetable rows grow.",
    x: 1.1,
    z: 1.25,
    radius: 2.3,
    object: r.userData.handle,
    activate: r.userData.activate
  });
  for (let a = 0; a < 5; a++) e(-3.5 + a * .69, 2.95, o => C0(o, .7));
  for (let a = 0; a < 3; a++) e(-3.84, 1.17 + a * .7, o => C0(o, .72), {
    heading: Math.PI / 2
  }), e(-.39, 1.55 + a * .69, o => C0(o, .69), {
    heading: Math.PI / 2
  });
  e(-2.5, 1.55, a => qd(a, 0, 0, 1.4, .6)), e(-1.38, 2.1, a => qd(a, 0, 0, 1.6, -.7)), e(-3.1, 2.28, a => qd(a, 0, 0, 1.17, 1.8)), e(-2.68, 3.63, a => {
    let o = ft(a);
    z(o, 0, .45, 0, .78, .1, .63, "#bd975e");
    for (let c of [-1, 1]) for (let l of [-.22, .22]) z(o, c * .28, .225, l, .055, .45, .055, "#8e7249");
    wn(o, 0, .5, 0, 1.4, !0);
  }), e(3.25, .52, a => {
    gs(a, 0, 0, 0, 1.65), wn(a, .45, 0, .08, 1.1, !0);
  }), e(-3.55, -3.1, a => {
    qr(a, 0, 0, 1.7, "#82a75e", 0);
  }), e(3.5, -1.7, a => {
    z(a, 0, .08, 0, .67, .16, .59, "#e6dcc1"), z(a, 0, .51, 0, .61, .71, .57, "#c99855"), Zr(a, .77, .75, .88, 1.1, "#9f7d4a");
    for (let o = 0; o < 5; o++) z(a, 0, .25 + o * .13, .294, .64, .02, .02, "#805f3b");
    z(a, 0, .19, .312, .2, .035, .025, "#625544");
  });
  for (let a = 0; a < 13; a++) {
    let o = -3.85 + a * .59,
      c = -4.05 + Math.sin(a * .63) * .19;
    e(o, c, l => qS(l, .8 + s.rand(0, .3)), {
      heading: .05
    });
  }
  for (let a = 0; a < 14; a++) {
    let o = 3.62 + s.rand(-.18, .2),
      c = -.7 + a * .31;
    e(o, c, l => a % 4 === 0 ? ms(l, 0, 0, "#dfb9d5", 1.1, 0) : Qn(l, 0, 0, "#8aa755", 1.2, 0));
  }
  e(1.15, 3.85, a => {
    it(a, [0, 0, 0], [0, 1.02, 0], .032, "#998054", 5), it(a, [-.38, .73, 0], [.38, .73, 0], .029, "#998054", 5), pt(a, 0, .76, 0, .19, .2, .115, "#8eac91", 0), pt(a, 0, 1.04, 0, .13, .14, .12, "#e4be7a"), Kt(a, 0, 1.2, 0, .24, .12, "#c59a53", 7, .05), gt(a, 0, 1.15, 0, .29, .025, "#d3af68", 9);
    for (let o of [-1, 1]) pt(a, o * .046, 1.067, .102, .012, .015, .009, "#4c574b", 0), it(a, [o * .09, .65, 0], [o * .16, .35, 0], .075, "#68828b", 5, .05);
  }), e(2.63, 3.96, a => dh(a, 0, .8, 0, "#eac759", 1.8));
}

function JS(s, t = 1.1) {
  let e = "#659765",
    n = "#477f58";
  gt(s, 0, t * .45, 0, .115, t * .9, e, 7), pt(s, 0, t * .91, 0, .115, .14, .115, e, 0);
  for (let [i, r] of [[-1, .49], [1, .7]]) it(s, [0, t * r, 0], [i * .25, t * r, 0], .075, n, 7), it(s, [i * .25, t * r, 0], [i * .25, t * (r + .23), 0], .075, e, 7), pt(s, i * .25, t * (r + .23), 0, .076, .09, .076, e, 0);
  for (let i = 0; i < 4; i++) for (let r of [-1, 1]) it(s, [r * .076, t * .15 + i * t * .18, .083], [r * .098, t * .17 + i * t * .18, .125], .004, "#d5d3a0", 3);
  ms(s, .03, -.01, "#da8290", .72, t + .025);
}

function $S(s) {
  b0(s, 0, 0, 0, .92, .71, .5, ["#dfb47a", "#cda16e", "#ebc790"]);
  for (let e of [-1, 1]) {
    gt(s, e * 1.12, .69, -.11, .17, 1.38, "#d6ad78", 7), gt(s, e * 1.12, 1.38, -.11, .23, .16, "#e3bc85", 7), z(s, e * 1.12, .08, -.11, .48, .16, .51, "#c39b69");
    for (let n = 0; n < 5; n++) z(s, e * 1.12, .23 + n * .22, -.288, .29, .016, .016, "#b58d5e");
  }
  z(s, -.56, .15, -.46, .93, .3, .61, "#d3a875"), z(s, -.64, .43, -.46, .57, .26, .58, "#ddb681");
  for (let e = 0; e < 6; e++) Ot(s, -1.21 + e * .42, .08, .55 + Math.sin(e) * .13, .18, .1, .17, e % 2 ? "#e1b97c" : "#cfa16a");
  let t = ft(s, .05, 1.3, .3);
  t.rotation.z = Math.PI / 4, z(t, 0, 0, 0, .16, .16, .022, "#c3985c");
}

function KS(s) {
  let t = "desert",
    e = (a, o, c, l) => s.place(t, a, o, c, l);
  s.addPath(t, [[-4, 1], [-2.4, .5], [-1, .3], [0, 0], [.75, -.6], [1.7, -1.4], [2.25, -2.5]], .72, "#ead399");
  let n = [[.94, .61], [1.14, .1], [1.81, .06], [2.38, .56], [2.43, 1.13], [1.99, 1.73], [1.3, 1.78], [.89, 1.29], [.94, .61]];
  s.addPath(t, n, 1.02, "#dac47f", .037), s.addPath(t, n, .8, "#3bc5ae", .055), s.addPath(t, [[1.32, .66], [1.58, .5], [1.94, .75], [2.02, 1.15], [1.73, 1.4], [1.38, 1.21], [1.32, .66]], .87, "#278f99", .065), e(2.1, -2.8, $S, {
    heading: -.25
  }), s.addCollider(t, 2.1, -2.8, .75), e(-2.4, -1.74, a => {
    R0(a, "#bd7361", 1.1);
    for (let c = 0; c < 5; c++) z(a, -.33 + c * .17, .025, 1.05, .12, .028, .83, c % 2 ? "#d2b576" : "#876a71");
    for (let c = 0; c < 5; c++) z(a, 0, .041, .72 + c * .15, .82, .015, .02, "#e1c898");
    let o = pt(a, -.09, .13, 1.15, .1, .115, .1, "#86a8a3", 0);
    Kt(a, -.09, .27, 1.15, .11, .07, "#bed0b1", 6), it(a, [-.02, .16, 1.15], [.09, .23, 1.15], .023, "#9ebcaf", 5), gs(a, 1.18, 0, .44, 1.3, "#a97c50"), wn(a, .99, 0, -.4, 1.4, !0), $s(a, -.88, .03, .69, 1.1), qi(a, 1.09, .05, .86, .14);
  }), s.addCollider(t, -2.4, -1.74, .81), e(-.98, -.55, a => S0(a, 0, 0, 1.05, 1.15)), e(-2, 2.55, a => S0(a, 0, 0, .69, -.8)), e(-3.3, 1.5, a => E0(a, 0, 0, 1.55, 1.4, !0)), [[.12, 2.2, 2.2], [2.98, 2.23, 2.5], [3.35, .28, 2.2], [.23, -.66, 1.8], [1.15, 2.96, 2.4]].forEach(([a, o, c], l) => {
    e(a, o, h => Yr(h, 0, 0, c, l * 1.3, 0)), s.addCollider(t, a, o, .18);
  });
  let i = [];
  for (let a = 0; a < 18; a++) {
    let o = a * pe / 18,
      c = 1.61 + Math.cos(o) * 1.39,
      l = .94 + Math.sin(o) * 1.44;
    e(c, l, h => {
      let u = ft(h);
      ms(u, 0, 0, ["#e88aa0", "#ffe5aa", "#acaaec"][a % 3], 1.25, 0), Qn(u, .055, .025, "#76b86d", .7, 0), Je(u), u.userData.dynamic = !0, u.scale.setScalar(.06), i.push(u);
    });
  }
  let r = e(1.05, .77, a => {
    for (let u = 0; u < 6; u++) {
      let d = u * pe / 6;
      Ot(a, Math.sin(d) * .17, .075, Math.cos(d) * .17, .095, .095, .09, u % 2 ? "#e5c99a" : "#c7b58a");
    }
    let o = ft(a, 0, .18, 0);
    Kt(o, 0, .21, 0, .095, .42, Tt("#85e4cb", {
      emissive: "#34c7ad",
      emissiveIntensity: .28
    }), 6), Kt(o, 0, .005, 0, .095, .14, "#b5ead2", 6).rotation.z = Math.PI;
    let c = new H.InstancedMesh(new H.IcosahedronGeometry(.019, 0), Tt("#cffff0", {
      emissive: "#77ead5",
      emissiveIntensity: .35
    }), 15);
    a.add(c), c.userData.dynamic = !0;
    let l = {
        bloom: !1,
        value: .06,
        pulse: 0,
        last: 0
      },
      h = new H.Object3D();
    ue(o, u => {
      let d = Math.min(.06, Math.max(0, u - l.last));
      l.last = u, l.value += ((l.bloom ? 1 : .06) - l.value) * Math.min(1, d * 1.9), l.pulse = Math.max(0, l.pulse - d), i.forEach((f, p) => {
        f.scale.setScalar(l.value * (1 + Math.sin(u * 1.3 + p) * .035));
      }), o.rotation.y = u * .35, o.position.y = .18 + Math.sin(u * 1.3) * .035, o.scale.setScalar(1 + Math.sin(u * 3) * l.pulse * .028), c.visible = l.bloom;
      for (let f = 0; f < 15; f++) {
        let p = (u * .13 + f / 15) % 1,
          x = u * .18 + f * 2.4;
        h.position.set(Math.cos(x) * (.3 + p * .75), .18 + Math.sin(p * Math.PI) * (.59 + l.pulse * .06), Math.sin(x) * (.3 + p * .75)), h.scale.setScalar((.35 + Math.sin(p * Math.PI) * .75) * (1 + l.pulse * .14)), h.updateMatrix(), c.setMatrixAt(f, h.matrix);
      }
      c.instanceMatrix.needsUpdate = !0;
    }), a.userData.crystal = o, a.userData.activate = () => (l.bloom = !0, l.pulse = 6, "The spring wakes. Desert flowers open around the turquoise water.");
  });
  s.addLandmark({
    id: "desert-spring",
    biome: t,
    label: "Hidden spring",
    action: "Wake the oasis",
    description: "Bring a little green back to the golden dunes.",
    x: 1.1,
    z: 1.1,
    radius: 2.2,
    object: r.userData.crystal,
    activate: r.userData.activate
  }), e(1.7, 1.55, a => {
    X1(a, 0, .085, 0, 1.3, "#b7efd6");
  });
  for (let [a, o, c] of [[-4, -1.6, 1.2], [-3.8, 2.8, 1.65], [-1.2, 3.8, .9], [3.7, -1.5, 1.25], [4.1, 1.65, .9], [-.9, -3.6, 1.6]]) e(a, o, l => JS(l, c)), s.addCollider(t, a, o, .16);
  for (let a = 0; a < 20; a++) {
    let o = a * 2.399,
      c = 3.4 + a % 4 * .35,
      l = Math.cos(o) * c,
      h = Math.sin(o) * c;
    e(l, h, u => a % 3 === 0 ? Ot(u, 0, .12, 0, .28, .19, .24, a % 2 ? "#d6ae76" : "#ba9165") : a % 3 === 1 ? Qn(u, 0, 0, "#b6a45f", 1, 0) : W1(u, 0, 0, 5, .2, "#b99462", .023));
  }
  for (let a = 0; a < 8; a++) {
    let o = -3.6 + a * .47,
      c = -3.5 + Math.sin(a * .7) * .12;
    s.addPath(t, [[o, c], [o + .22, c + .07], [o + .45, c + .08]], .025, "#c6a574", .019);
  }
  e(-3.75, -.24, a => {
    b0(a, 0, 0, 0, .3, .17, .23, ["#d0a271", "#c29868", "#dcb47e"], 1.1), Ot(a, .34, .07, .13, .2, .1, .15, "#bd966c");
  }), e(2.84, 3.51, a => {
    let o = Kt(a, 0, .16, 0, .17, .28, "#c78c67", 9, .14);
    gt(a, 0, .31, 0, .17, .032, "#dfac7e", 9), gt(a, 0, .316, 0, .126, .035, "#705d44", 9);
  });
  for (let a = 0; a < 8; a++) {
    let o = -2.8 + a * .27,
      c = .46 - a * .09;
    e(o, c, l => {
      pt(l, -.07, .012, -.05, .035, .014, .063, "#d1ae75", 0), pt(l, .07, .012, .065, .035, .014, .063, "#d1ae75", 0);
    }, {
      heading: 1.9
    });
  }
  e(.39, 2.3, a => dh(a, 0, .6, 0, "#edb288", 1.8));
}

function jS(s, t = 1, e = "#526569") {
  let n = ft(s);
  return Kt(n, 0, t / 2, 0, .18, t, e, 6, .15), Kt(n, .24, t * .29, .05, .16, t * .58, "#66716e", 6, .14), Kt(n, -.18, t * .22, .15, .13, t * .44, "#46595c", 5, .1), n;
}

function QS(s) {
  let e = [{
      y: 0,
      r: 2.12
    }, {
      y: .58,
      r: 1.85
    }, {
      y: 1.4,
      r: 1.3
    }, {
      y: 2.27,
      r: .86
    }, {
      y: 2.94,
      r: .67
    }, {
      y: 2.75,
      r: .43
    }],
    n = ["#384b52", "#506268", "#43555c", "#667371", "#586363"];
  for (let u = 0; u < e.length - 1; u++) {
    let d = [],
      f = [];
    for (let p = 0; p < 15; p++) {
      let x = (g, y) => {
        let S = y * pe / 15,
          v = e[g].r * (1 + Math.sin(y * 13.31 + g * 2.6) * .1);
        return [Math.cos(S) * v, e[g].y + (g > 0 && g < 5 ? Math.sin(y * 7.3) * .08 : 0), Math.sin(S) * v];
      };
      d.push(x(u, p), x(u, (p + 1) % 15), x(u + 1, p), x(u, (p + 1) % 15), x(u + 1, (p + 1) % 15), x(u + 1, p));
      let m = new H.Color(n[(p + u * 2) % n.length]).multiplyScalar(u === 4 ? .62 : 1);
      for (let g = 0; g < 6; g++) f.push([m.r, m.g, m.b]);
    }
    vt(s, Jt(d, null, f), Tt("#ffffff", {
      vertexColors: !0,
      side: H.DoubleSide
    }));
  }
  let i = Tt("#f27431", {
      emissive: "#ff4810",
      emissiveIntensity: .7,
      roughness: .8,
      side: H.DoubleSide
    }),
    r = Tt("#ffd067", {
      emissive: "#ffab2c",
      emissiveIntensity: .78,
      roughness: .8,
      side: H.DoubleSide
    });
  gt(s, 0, 2.755, 0, .44, .035, i, 15), gt(s, -.04, 2.778, .04, .29, .017, r, 13);
  for (let [u, d] of [[1.3, 0], [2.38, 1], [-.4, 2]]) {
    let f = [[Math.cos(u) * .53, 2.9, Math.sin(u) * .53], [Math.cos(u + .07) * .71, 2.58, Math.sin(u + .07) * .71], [Math.cos(u - .07) * .94, 2.18, Math.sin(u - .07) * .94], [Math.cos(u + .06) * 1.36, 1.35, Math.sin(u + .06) * 1.36], [Math.cos(u - .12) * 1.86, .56, Math.sin(u - .12) * 1.86], [Math.cos(u) * 2.13, .035, Math.sin(u) * 2.13]];
    Ro(s, f, [.18, .18, .23, .23, .29, .37], i, .034), Ro(s, f, [.036, .06, .1, .075, .11, .13], r, .046);
    for (let p = 0; p < 7; p++) {
      let x = p / 6;
      Ot(s, Math.cos(u + .4) * (.92 + x * 1.02), 2.1 - x * 1.9, Math.sin(u + .4) * (.92 + x * 1.02), .13, .13, .11, "#37464b");
    }
  }
  let a = ft(s, 0, 2.8, 0),
    o = new H.InstancedMesh(new H.IcosahedronGeometry(1, 0), Tt("#889795", {
      transparent: !0,
      opacity: .38,
      depthWrite: !1
    }), 10),
    c = new H.InstancedMesh(new H.IcosahedronGeometry(.05, 0), r, 26);
  a.add(o, c);
  let l = new H.Object3D(),
    h = {
      power: 0,
      last: 0
    };
  return ue(a, u => {
    let d = Math.min(.07, Math.max(0, u - h.last));
    h.last = u, h.power = Math.max(0, h.power - d * .19), i.emissiveIntensity = .6 + Math.sin(u * 1.3) * .12 + h.power * .4;
    for (let f = 0; f < 10; f++) {
      let p = (u * (.06 + h.power * .07) + f / 10) % 1;
      l.position.set(Math.sin(f * 1.2 + p * 2) * p * .35, p * (1.2 + h.power * 1.3), Math.cos(f + p) * p * .2), l.rotation.set(p, f, p * .8), l.scale.setScalar(.18 + p * (.25 + h.power * .3)), l.updateMatrix(), o.setMatrixAt(f, l.matrix);
    }
    o.instanceMatrix.needsUpdate = !0;
    for (let f = 0; f < 26; f++) {
      let p = (u * (.22 + h.power * .34) + f / 26) % 1,
        x = f * 2.4,
        m = p * (.18 + h.power * 1.28);
      l.position.set(Math.cos(x) * m, .04 + Math.sin(p * Math.PI) * (.3 + h.power * 2.5) - p * p * h.power * .5, Math.sin(x) * m), l.rotation.set(u + f, u, f), l.scale.setScalar((.24 + h.power * .74) * (1 - p * .5)), l.updateMatrix(), c.setMatrixAt(f, l.matrix);
    }
    c.instanceMatrix.needsUpdate = !0;
  }), {
    plume: a,
    erupt() {
      return h.power = 1, "The seismograph chirps. A shower of glowing embers rises from the crater!";
    }
  };
}

function t3(s) {
  let t = "volcano",
    e = (r, a, o, c) => s.place(t, r, a, o, c);
  s.addPath(t, [[4, 1.7], [2.8, 1.9], [1.5, 1.3], [.45, .5], [0, 0], [.4, -1], [1.4, -2.5]], .68, "#8a8775"), s.addPath(t, [[-.73, -.72], [-.68, .2], [-1.42, 1], [-1.2, 2], [-1.7, 3.1], [-2.6, 4.3]], .48, "#f57235", .052), s.addPath(t, [[-.73, -.72], [-.68, .2], [-1.42, 1], [-1.2, 2], [-1.7, 3.1], [-2.6, 4.3]], .13, "#ffcf64", .07), s.addPath(t, [[-2.95, -1.22], [-3.1, -.6], [-3.6, .38], [-3.5, 1], [-4.1, 1.9]], .32, "#ed7136", .052);
  let n;
  e(-1.3, -2.77, r => {
    n = QS(r);
  }), s.addCollider(t, -1.3, -2.77, 1.94), e(2.6, -.55, r => {
    J1(r, 0, 0, -.9).scale.multiplyScalar(1.9), wn(r, .61, 0, -.2, 1.15, !0);
  }), s.addCollider(t, 2.6, -.55, .62), e(2.2, 2.9, r => {
    R0(r, "#d5a365", .95), $s(r, -.83, 0, .68, 1.1), wn(r, .92, 0, .1, 1.2);
  }), s.addCollider(t, 2.2, 2.9, .67);
  let i = e(1.22, 1.21, r => {
    for (let l = 0; l < 3; l++) {
      let h = l * pe / 3;
      it(r, [0, .8, 0], [Math.cos(h) * .37, .02, Math.sin(h) * .37], .024, "#a1a996", 5);
    }
    z(r, 0, .83, 0, .44, .23, .28, "#e1ba6c"), z(r, 0, .85, .151, .33, .12, .02, "#40575a");
    for (let l = 0; l < 7; l++) z(r, -.135 + l * .044, .85 + Math.sin(l * 2) * .029, .166, .025, .016, .015, "#99d7b1");
    pt(r, .17, .78, .169, .026, .026, .02, "#dc7851", 0), it(r, [.1, .91, -.05], [.1, 1.41, -.05], .012, "#5d726d", 4);
    let a = ft(r, .1, 1.42, -.05);
    pt(a, 0, 0, 0, .04, .04, .04, Tt("#7fcab3", {
      emissive: "#40bda8",
      emissiveIntensity: .55
    }), 0);
    let o = [];
    for (let l = 0; l < 3; l++) {
      let h = vt(a, new H.TorusGeometry(.15, .012, 4, 16), Tt("#a7e7c8", {
        transparent: !0,
        opacity: .65,
        depthWrite: !1
      }), 0, .1, 0);
      h.rotation.x = Math.PI / 2, o.push(h);
    }
    let c = {
      ping: 0,
      last: 0
    };
    ue(a, l => {
      let h = Math.min(.08, Math.max(0, l - c.last));
      c.last = l, c.ping = Math.max(0, c.ping - h), o.forEach((u, d) => {
        u.visible = c.ping > 0;
        let f = (l * .6 + d / 3) % 1;
        u.position.y = f * .85, u.scale.setScalar(.25 + f * 2.7);
      });
    }), r.userData.antenna = a, r.userData.activate = () => (c.ping = 6, n.erupt());
  });
  s.addLandmark({
    id: "volcano-expedition",
    biome: t,
    label: "Expedition station",
    action: "Scan the volcano",
    description: "Check the instruments and wake the mountain.",
    x: 1.2,
    z: 1.25,
    radius: 2.35,
    object: i.userData.antenna,
    activate: i.userData.activate
  }), e(-1.24, 1.75, r => tx(r, 1.32, .72, !0), {
    heading: Math.PI / 2 + .22
  }), e(3.23, 1.5, r => {
    gs(r, 0, 0, 0, 1.35, "#9b7251"), wn(r, .38, 0, .04, 1.05), qi(r, .3, .03, .42, .14);
  }), e(.08, 2.54, r => {
    Q1(r, "#d3b076");
    let a = ft(r, .22, 0, .14);
    Kt(a, 0, .11, 0, .085, .22, "#e69b49", 4);
  });
  for (let [r, a, o] of [[3.4, -2.85, 2], [4.2, -.65, 2.2], [3.9, 2.52, 1.8], [-3.8, 2.62, 1.65], [-.4, 4.22, 1.7]]) e(r, a, c => Yr(c, 0, 0, o, s.rand(0, 6), 0)), s.addCollider(t, r, a, .16);
  for (let [r, a, o] of [[-4, -1.2, .7], [-3.5, -3, 1.2], [.55, -4.25, .85], [2.2, -3.9, 1.3], [-3.8, .32, .9], [-2.65, 2.55, .6], [.37, 3.75, .65], [3.9, .6, .7]]) e(r, a, c => jS(c, o)), s.addCollider(t, r, a, .27);
  for (let r = 0; r < 23; r++) {
    let a = r * 2.399,
      o = 2.3 + r % 5 * .39,
      c = Math.cos(a) * o,
      l = Math.sin(a) * o;
    l < -1 && c < .7 || c > .6 && c < 3.3 && l > .5 && l < 3.5 || e(c, l, h => r % 3 === 0 ? Jr(h, 0, 0, 1.3, 0, "#619276") : Ot(h, 0, .075, 0, s.rand(.1, .25), s.rand(.07, .18), s.rand(.1, .22), r % 2 ? "#5a6b65" : "#8b8870"));
  }
  for (let r = 0; r < 10; r++) {
    let a = -3.9 + r * .36,
      o = 3.35 + Math.sin(r * .9) * .16;
    e(a, o, c => {
      Qn(c, 0, 0, "#6e9271", 1.15, 0), r % 3 === 0 && ms(c, .07, 0, "#e69a62", 1.1, 0);
    });
  }
  for (let r = 0; r < 8; r++) {
    let a = .05 + r * .43,
      o = -1.55 + Math.cos(r * .85) * .4;
    e(o + (r % 2 ? .39 : -.25), a, c => Ot(c, 0, .045, 0, .105, .055, .09, r % 3 ? "#4a5657" : "#9c795c"));
  }
  for (let [r, a] of [[3.8, -2.1], [3.45, 2.85], [-3.5, 2.75], [-.75, 4.25]]) e(r, a, o => Jr(o, 0, 0, 1.35, 0, "#7b9d73"));
  e(2.03, .12, r => {
    wn(r, 0, 0, 0, 1.15);
    for (let a = 0; a < 4; a++) pt(r, -.075 + a * .05, .2, 0, .035, .04, .04, a % 2 ? "#d8bc77" : "#6b7f75", 0);
  }), e(.53, 2.45, r => {
    z(r, 0, .26, 0, .55, .06, .37, "#bda77d");
    for (let a of [-1, 1]) for (let o of [-.13, .13]) it(r, [a * .19, .25, o], [a * .25, .01, o], .016, "#8c9179", 4);
    z(r, .06, .304, 0, .27, .011, .2, "#ebdfba");
    for (let a = 0; a < 3; a++) z(r, -.045, .312, -.05 + a * .04, .08, .007, .008, "#85a28e");
  });
  for (let [r, a] of [[-3.6, 1.45], [.08, -1.2]]) e(r, a, o => {
    for (let c = 0; c < 3; c++) {
      let l = Kt(o, (c - 1) * .085, .13 + c % 2 * .07, Math.sin(c) * .045, .055, .25 + c % 2 * .14, Tt("#d7a758", {
        emissive: "#b67625",
        emissiveIntensity: .12
      }), 5);
      l.rotation.z = (c - 1) * .19;
    }
  });
  e(-2.8, .98, r => {
    let a = it(r, [0, 0, 0], [.14, 1, 0], .09, "#5e6257", 6, .045);
    it(r, [.07, .58, 0], [-.28, .83, .1], .035, "#6f6e5d", 5, .016), it(r, [.12, .78, 0], [.34, 1.12, -.11], .032, "#676556", 5, .013);
  }), e(3.75, 3.3, r => dh(r, 0, .71, 0, "#e68d51", 1.9));
}

function ex(s) {
  HS(s), ZS(s), KS(s), t3(s);
}

var gn = {
  cream: "#f8ecd2",
  wood: "#bc8c58",
  darkWood: "#755c45",
  teal: "#47b5ad",
  red: "#e66555",
  navy: "#344c63",
  sand: "#e9c77e",
  ice: "#b9eaf1",
  blueIce: "#5daecc"
};

function Yi(s, t, e, n, i, r, a, o = !1, c = 14) {
  let l = vt(s, new H.TorusGeometry(i, r, 5, c), a, t, e, n);
  return o && (l.rotation.x = Math.PI / 2), l;
}

function Zd(s, t = 0, e = .26, n = 0, i = .18) {
  let r = ft(s, t, e, n);
  Yi(r, 0, 0, 0, i, i * .27, "#fcf4de");
  for (let a = 0; a < 4; a++) {
    let o = a * Math.PI / 2,
      c = vt(r, new H.TorusGeometry(i, i * .282, 5, 3, .34), "#e37555");
    c.rotation.z = o - .17;
  }
  return r;
}

function e3(s, t = .68, e = "#ee7862", n = "#fff1d0") {
  gt(s, 0, .75, 0, .022, 1.5, "#e9d8ab", 6);
  let i = 1.44,
    r = 12;
  for (let a = 0; a < r; a++) {
    let o = a * pe / r,
      c = (a + 1) * pe / r,
      l = (o + c) / 2,
      h = [[0, i + .23, 0], [Math.cos(o) * t, i, Math.sin(o) * t], [Math.cos(l) * t * 1.025, i - .058, Math.sin(l) * t * 1.025], [Math.cos(c) * t, i, Math.sin(c) * t]];
    vt(s, Jt(h, [[0, 1, 2], [0, 2, 3]]), Tt(a % 2 ? n : e, {
      side: H.DoubleSide
    })), it(s, [0, i + .19, 0], [Math.cos(o) * t, i - .005, Math.sin(o) * t], .009, "#dccba8", 3);
  }
  Kt(s, 0, i + .25, 0, .038, .09, n, 6);
}

function nx(s, t = "#67bcb9") {
  let e = "#f3e8c9";
  for (let i of [-1, 1]) Ln(s, [i * .2, .12, .48], [i * .2, .27, -.16], .035, .035, e), Ln(s, [i * .2, .25, -.16], [i * .2, .67, -.5], .035, .035, e), Ln(s, [i * .2, 0, .3], [i * .2, .29, .08], .029, .029, e), Ln(s, [i * .2, 0, -.27], [i * .2, .29, -.08], .029, .029, e);
  for (let i = 0; i < 5; i++) {
    let r = -.16 + i * .08,
      a = z(s, r, .219, .16, .075, .023, .64, i % 2 ? gn.cream : t);
    a.rotation.x = -.2;
    let o = z(s, r, .455, -.326, .075, .024, .54, i % 2 ? gn.cream : t);
    o.rotation.x = .86;
  }
  let n = z(s, 0, .616, -.446, .32, .085, .12, "#fff1d8");
  n.rotation.x = .86;
}

function n3(s, t = 1, e = "#f5e7c9") {
  let n = ft(s, 0, .014, 0, t),
    i = [];
  for (let r = 0; r < 7; r++) {
    let a = -.3 + r * Math.PI / 8,
      o = -.3 + (r + 1) * Math.PI / 8;
    i.push([0, .015, -.04], [Math.cos(a) * .12, .035, Math.sin(a) * .12], [Math.cos(o) * .12, .035, Math.sin(o) * .12]), it(n, [0, .02, -.04], [Math.cos(a) * .12, .045, Math.sin(a) * .12], .007, r % 2 ? "#e9d1b5" : e, 3);
  }
  vt(n, Jt(i), Tt(e, {
    side: H.DoubleSide
  }));
}

function i3(s, t = "#e4926e", e = 1) {
  let n = ft(s, 0, .025, 0, e),
    i = [],
    r = [];
  i.push([0, .045, 0]);
  for (let a = 0; a < 10; a++) {
    let o = a * pe / 10,
      c = a % 2 ? .057 : .18;
    i.push([Math.cos(o) * c, a % 2 ? .018 : .004, Math.sin(o) * c]);
  }
  for (let a = 0; a < 10; a++) r.push([0, a + 1, (a + 1) % 10 + 1]);
  vt(n, Jt(i, r), Tt(t, {
    side: H.DoubleSide
  }));
  for (let a = 0; a < 5; a++) {
    let o = a * pe / 5;
    for (let c = 1; c <= 2; c++) pt(n, Math.cos(o) * .048 * c, .042 - c * .009, Math.sin(o) * .048 * c, .008, .008, .008, "#ffd7b4", 0);
  }
}

function s3(s) {
  let t = "#d8bd84";
  for (let i of [-.43, .43]) for (let r of [-.4, .4]) Ln(s, [i * 1.1, 0, r * 1.12], [i, 1.3, r], .065, .065, t);
  for (let i of [-1, 1]) Ln(s, [i * .45, .22, -.4], [i * .43, 1.15, .4], .035, .035, "#a98e62"), Ln(s, [i * .45, .22, .4], [i * .43, 1.15, -.4], .035, .035, "#a98e62");
  for (let i = 0; i < 9; i++) z(s, -.54 + i * .135, 1.28, 0, .125, .07, 1.12, i % 2 ? "#edd29d" : t);
  z(s, 0, 1.65, -.17, .88, .63, .63, "#e88766"), z(s, 0, 1.85, .158, .63, .26, .025, "#7bb9bd");
  for (let i of [-1, 1]) z(s, i * .45, 1.86, -.16, .015, .25, .35, "#80c2c5");
  z(s, 0, 1.84, .18, .028, .31, .02, gn.cream), z(s, 0, 2.025, -.12, 1.14, .08, .96, "#b04d49");
  let e = z(s, 0, 2.08, .12, 1.18, .09, .58, gn.cream);
  e.rotation.x = .16;
  for (let i = 0; i < 6; i++) z(s, -.49 + i * .2, 2.071, .12, .09, .099, .59, "#f0aa73").rotation.x = .16;
  for (let i of [-.53, .53]) Ln(s, [i, 1.29, .48], [i, 1.78, .48], .04, .04, gn.cream);
  z(s, 0, 1.77, .48, 1.11, .035, .035, gn.cream);
  for (let i of [-1, 1]) Ln(s, [i * .23, 0, .95], [i * .23, 1.27, .53], .046, .046, t);
  for (let i = 0; i < 7; i++) Ln(s, [-.24, .12 + i * .165, .91 - i * .053], [.24, .12 + i * .165, .91 - i * .053], .039, .039, gn.cream);
  Zd(s, -.52, 1.08, .05, .17).rotation.y = -Math.PI / 2, z(s, .46, 1.51, -.18, .019, .2, .2, gn.cream), z(s, .474, 1.51, -.18, .013, .12, .041, "#e35e57"), z(s, .475, 1.51, -.18, .013, .042, .13, "#e35e57"), it(s, [.46, 1.98, -.37], [.46, 2.81, -.37], .018, gn.cream, 5);
  let n = ft(s, .46, 2.67, -.37);
  vt(n, Jt([[0, 0, 0], [.46, -.025, .035], [.4, -.2, .012], [0, -.18, 0]], [[0, 1, 2], [0, 2, 3]]), Tt("#f4cf62", {
    side: H.DoubleSide
  })), ue(n, i => {
    n.rotation.y = Math.sin(i * 1.6) * .16;
  });
}

function ax(s, t = "#db6655", e = 1.5, n = .6) {
  let i = n / 2,
    r = e / 2,
    a = [[0, -.16, r], [-i * .82, -.13, r * .47], [-i * .87, -.13, -r * .78], [i * .87, -.13, -r * .78], [i * .82, -.13, r * .47], [0, .12, r * 1.07], [-i, .12, r * .53], [-i, .12, -r * .84], [i, .12, -r * .84], [i, .12, r * .53]],
    o = [];
  for (let c = 0; c < 5; c++) {
    let l = (c + 1) % 5;
    o.push([c, l, c + 5], [l, l + 5, c + 5]);
  }
  o.push([0, 2, 1], [0, 3, 2], [0, 4, 3]), vt(s, Jt(a, o), Tt(t, {
    side: H.DoubleSide
  })), uh(s, [[0, r], [-i * .9, r * .48], [-i * .9, -r * .78], [i * .9, -r * .78], [i * .9, r * .48]], .055, "#c6a273");
  for (let c = 0; c < 5; c++) {
    let l = (c + 1) % 5;
    it(s, a[c + 5], a[l + 5], .024, gn.cream, 5);
  }
}

function ix(s, t = "#f0be53") {
  let e = ft(s, 0, .07, 0);
  pt(e, 0, -.015, 0, .2, .1, .72, t, 1), pt(e, 0, .078, -.02, .122, .014, .225, "#455665", 1), z(e, 0, .09, -.14, .2, .075, .08, "#79857b");
  for (let i of [-1, 1]) for (let r = 0; r < 3; r++) it(e, [i * .08, .052, i * (.36 + r * .055)], [i * -.08, .052, i * (.39 + r * .055)], .006, "#5c7370", 3);
  let n = ft(e, 0, .15, .05, 1, -.62);
  it(n, [-.64, 0, 0], [.64, 0, 0], .012, "#dfd4af", 5);
  for (let i of [-1, 1]) pt(n, i * .64, 0, 0, .19, .013, .07, "#ec935b", 0);
  return e;
}

function r3(s) {
  let t = ft(s, 0, .025, 0);
  ax(t, "#ed9c61", .94, .43), it(t, [0, .07, -.04], [0, 1.04, -.04], .018, "#ac7d4e", 6);
  let e = vt(t, Jt([[.025, .24, -.03], [.025, .98, -.03], [.025, .29, .5]], [[0, 1, 2]]), Tt("#fff5cf", {
    side: H.DoubleSide
  }));
  return vt(t, Jt([[.03, .38, .08], [.03, .69, .045], [.03, .4, .35]], [[0, 1, 2]]), Tt("#ed8c66", {
    side: H.DoubleSide
  })), vt(t, Jt([[-.016, .91, -.03], [-.016, .25, -.03], [-.016, .26, -.38]], [[0, 1, 2]]), Tt("#8ac8bd", {
    side: H.DoubleSide
  })), it(t, [0, .26, -.04], [0, .26, .49], .012, "#ad8354", 5), qi(t, -.1, .15, -.17, .055), {
    group: t,
    sail: e
  };
}

function a3(s) {
  let t = ft(s, 0, .02, 0);
  ax(t, "#da5548", 2.55, 1);
  for (let i = 0; i < 10; i++) z(t, -.4 + i * .085, .065, -.12, .009, .008, 1.83, "#a38058");
  z(t, 0, .34, .2, .63, .53, .7, "#f7e6bd"), z(t, 0, .42, .563, .45, .25, .015, "#619eaf"), z(t, 0, .43, .577, .035, .28, .02, gn.cream);
  for (let i of [-1, 1]) {
    z(t, i * .327, .44, .2, .019, .23, .43, "#639eae"), z(t, i * .342, .44, .2, .017, .25, .025, "#eee3c3");
    for (let a of [-.67, .75]) it(t, [i * .45, .12, a], [i * .45, .44, a], .013, "#ded5b3", 5);
    it(t, [i * .45, .43, -.68], [i * .45, .43, .76], .013, "#eae1c0", 5);
    let r = Yi(t, i * .504, .09, -.34, .11, .033, "#3a4d55");
    r.rotation.y = Math.PI / 2, Zd(t, i * .344, .36, .12, .12).rotation.y = Math.PI / 2;
  }
  z(t, 0, .64, .2, .79, .075, .86, "#c64e43"), gt(t, .2, .78, .08, .055, .27, "#415662", 6), Kt(t, .2, .943, .08, .083, .06, "#e6c88e", 6), it(t, [0, .66, .29], [0, 1.4, .29], .017, "#e8d9b7", 5), it(t, [-.26, 1.14, .29], [.26, 1.14, .29], .012, "#d6c4a3", 4);
  let e = ft(t, 0, 1.39, .29);
  e.userData.dynamic = !0, vt(e, Jt([[0, 0, 0], [.36, -.06, -.018], [0, -.15, 0]], [[0, 1, 2]]), Tt("#eabb55", {
    side: H.DoubleSide
  })), wn(t, -.2, .08, -.7, 1.1, !1);
  for (let i = 0; i < 3; i++) Xd(t, -.26 + i * .065, .25, -.71, i % 2 ? "#b7d6cf" : "#7aabb4", .24).rotation.x = Math.PI / 2;
  gs(t, .24, .085, -.66, .88, "#a6a079"), qi(t, .27, .09, .79, .1);
  let n = ft(t, -.22, .12, -.38);
  gt(n, 0, .1, 0, .12, .2, "#577d7f", 8), it(t, [-.33, .1, -.48], [-.61, .88, -.59], .023, "#477479", 5), it(t, [-.61, .88, -.59], [-.95, .7, -.64], .022, "#477479", 5), it(t, [-.95, .7, -.64], [-.95, -.16, -.64], .006, "#e5d2a8", 3);
  for (let i = 0; i < 5; i++) for (let r = 0; r < 5; r++) it(t, [-.67 + i * .065, .12, -.38 + r * .07], [-.61 + i * .065, .17, -.31 + r * .07], .004, "#6e8f79", 3);
  return ue(t, i => {
    t.position.y = .035 + Math.sin(i * .76) * .045, t.rotation.z = Math.sin(i * .58 + 1) * .032, t.rotation.x = Math.sin(i * .71) * .018, e.rotation.y = Math.sin(i * 1.3) * .17;
  }), t;
}

function o3(s, t, e = .44, n = 0) {
  let i = ft(s);
  pt(i, 0, .035, 0, .14, .06, .13, "#bdbd87", 0), it(i, [0, .03, 0], [.018, e * .75, 0], .047, t, 5, .028);
  for (let r = 0; r < 5; r++) {
    let a = r * 2.39 + n,
      o = e * (.3 + r * .1),
      c = .12 + r % 2 * .045,
      l = [Math.cos(a) * c, o + e * .3, Math.sin(a) * c];
    it(i, [0, o, 0], l, .029, t, 5, .015), pt(i, ...l, .03, .033, .031, r % 2 ? t : "#f4a889", 0), r % 2 === 0 && it(i, [l[0] * .72, l[1] - .04, l[2] * .72], [l[0] * 1.29, l[1] + .07, l[2] * .95], .017, t, 4, .008);
  }
  return i;
}

function c3(s, t = .6, e = "#4d9d79") {
  let n = ft(s);
  for (let i = 0; i < 4; i++) {
    let r = [],
      a = i * 2.4;
    for (let c = 0; c < 6; c++) {
      let l = c / 5,
        h = Math.cos(a) * (l * .19 + Math.sin(l * 5) * .03),
        u = Math.sin(a) * l * .19;
      r.push([h - .038 * (1 - l * .8), t * l * (1 - i * .06), u], [h + .038 * (1 - l * .8), t * l * (1 - i * .06), u]);
    }
    let o = [];
    for (let c = 0; c < 5; c++) o.push([c * 2, c * 2 + 1, c * 2 + 2], [c * 2 + 1, c * 2 + 3, c * 2 + 2]);
    vt(n, Jt(r, o), Tt(i % 2 ? e : "#80b975", {
      side: H.DoubleSide
    }));
  }
  return n;
}

function l3(s) {
  let t = "#b6bdb0",
    e = "#f4e9cc",
    n = "#d76a56";
  for (let [d, f, p, x, m] of [[0, 0, 1.1, .36, .96], [-.63, .38, .5, .2, .45], [.63, -.24, .45, .31, .45]]) Ot(s, d, .05, f, p, x, m, t, 0);
  gt(s, 0, .24, 0, .57, .16, "#d2c6a3", 10);
  for (let d = 0; d < 6; d++) {
    let f = .32 + d * .27,
      p = .405 - d * .022,
      x = p - .022;
    Kt(s, 0, f + .135, 0, p, .27, d % 2 ? e : n, 12, x);
  }
  z(s, 0, .55, .405, .19, .34, .025, "#526a70"), z(s, -.058, .57, .426, .021, .019, .016, "#f0c969");
  for (let d = 0; d < 3; d++) {
    let f = d * 2 + .4,
      p = .39 - d * .044,
      x = ft(s, Math.sin(f) * p, .8 + d * .31, Math.cos(f) * p, 1, f);
    z(x, 0, 0, 0, .13, .19, .02, e), z(x, 0, 0, .014, .09, .14, .02, "#78b2bd");
  }
  gt(s, 0, 1.99, 0, .48, .085, "#527b80", 12);
  for (let d = 0; d < 12; d++) {
    let f = d * pe / 12;
    it(s, [Math.cos(f) * .45, 2.02, Math.sin(f) * .45], [Math.cos(f) * .45, 2.3, Math.sin(f) * .45], .012, "#e6d7b5", 4);
  }
  Yi(s, 0, 2.3, 0, .45, .014, "#e5d9b9", !0);
  let i = ft(s, 0, 2.24, 0);
  gt(i, 0, 0, 0, .265, .42, Tt("#a9d6d0", {
    transparent: !0,
    opacity: .34,
    depthWrite: !1,
    roughness: .26
  }), 8);
  let r = Tt("#f7dc93", {
      emissive: "#ffce73",
      emissiveIntensity: .1,
      roughness: .3
    }).clone(),
    a = gt(i, 0, 0, 0, .125, .29, r, 8);
  a.userData.dynamic = !0;
  for (let d = 0; d < 8; d++) {
    let f = d * pe / 8;
    it(s, [Math.cos(f) * .27, 2.04, Math.sin(f) * .27], [Math.cos(f) * .27, 2.48, Math.sin(f) * .27], .015, "#66898c", 4);
  }
  Kt(s, 0, 2.58, 0, .37, .25, "#ba574b", 8), it(s, [0, 2.7, 0], [0, 2.99, 0], .015, "#4b626d", 5), pt(s, 0, 3, 0, .043, .053, .043, "#e7c783", 0);
  let o = ft(s, 0, 2.26, 0),
    c = new H.MeshBasicMaterial({
      color: "#ffe8a2",
      transparent: !0,
      opacity: .075,
      depthWrite: !1,
      side: H.DoubleSide,
      blending: H.AdditiveBlending
    }),
    l = vt(o, Jt([[.07, -.07, 0], [.07, .07, 0], [3.2, .46, -.46], [3.2, -.46, -.46], [3.2, .46, .46], [3.2, -.46, .46]], [[0, 1, 2], [0, 2, 3], [0, 5, 4], [0, 4, 1], [1, 4, 2], [0, 3, 5]]), c);
  l.castShadow = !1, o.visible = !1;
  let h = new H.PointLight("#ffdb8a", 0, 5.5, 2);
  h.position.y = 2.28, s.add(h);
  let u = !1;
  return ue(o, d => {
    o.rotation.y = d * .36;
  }), {
    setLit(d) {
      u = d, r.emissiveIntensity = u ? 2.7 : .1, h.intensity = u ? 3 : 0, o.visible = u;
    },
    get lit() {
      return u;
    }
  };
}

function sx(s, t = 2.3, e = .53, n = "#71bfd9") {
  let r = [],
    a = [],
    o = new H.Color(n),
    c = [[0, e], [.4 * t, e * .8], [.9 * t, e * .45]],
    l = (h, u) => {
      let d = u * pe / 5;
      return [Math.cos(d) * c[h][1] + .1 * h, c[h][0], Math.sin(d) * c[h][1]];
    };
  for (let h = 0; h < 2; h++) for (let u = 0; u < 5; u++) {
    let d = l(h, u),
      f = l(h, (u + 1) % 5),
      p = l(h + 1, u),
      x = l(h + 1, (u + 1) % 5);
    r.push(d, f, p, f, x, p);
    let m = o.clone().multiplyScalar(.83 + u % 3 * .105);
    for (let g = 0; g < 6; g++) a.push([m.r, m.g, m.b]);
  }
  for (let h = 0; h < 5; h++) {
    r.push(l(2, h), l(2, (h + 1) % 5), [.16, t, -.06]);
    let u = new H.Color(h % 2 ? "#cef0f5" : "#a2daeb");
    for (let d = 0; d < 3; d++) a.push([u.r, u.g, u.b]);
  }
  vt(s, Jt(r, null, a), Tt("#fff", {
    vertexColors: !0
  }));
  for (let h = 0; h < 2; h++) it(s, [-e * .45 + h * .22, t * .13, e * .68], [-e * .38 + h * .22, t * (.63 + h * .1), e * .31], .018, "#c7edf4", 3);
}

function rx(s, t = .65, e = .18) {
  let n = [[-.62, -.2], [-.38, -.58], [.25, -.51], [.6, -.11], [.45, .45], [-.19, .57], [-.58, .26]].map(([i, r]) => [i * t, r * t]);
  uh(s, n, e, "#eaf7ef", e), uh(s, n.map(([i, r]) => [i * .93, r * .93]), e + .016, "#fafff2");
  for (let i = 0; i < 3; i++) {
    let r = -.2 + i * .16;
    it(s, [r * t, e + .018, -.28 * t], [(r + .08) * t, e + .02, .11 * t], .008, "#b1e0e8", 3);
  }
}

function h3(s) {
  for (let e = 0; e < 5; e++) {
    let n = e * Math.PI / 10,
      i = (e + 1) * Math.PI / 10,
      r = .96 * Math.cos(n),
      a = .96 * Math.cos(i),
      o = .96 * Math.sin(n),
      c = .96 * Math.sin(i),
      l = 16 - e * 2;
    for (let h = 0; h < l; h++) {
      let u = (h + e % 2 * .5) * pe / l + .015,
        d = (h + 1 + e % 2 * .5) * pe / l - .015;
      e < 2 && Math.sin((u + d) / 2) > .85 || vt(s, Jt([[Math.cos(u) * r, o + .017, Math.sin(u) * r], [Math.cos(d) * r, o + .017, Math.sin(d) * r], [Math.cos(u) * a, c - .008, Math.sin(u) * a], [Math.cos(d) * a, c - .008, Math.sin(d) * a]], [[0, 1, 2], [1, 3, 2]]), Tt((e + h) % 3 ? "#edf6ed" : "#c6e7ed", {
        side: H.DoubleSide
      }));
    }
  }
  for (let e = 0; e < 3; e++) for (let n of [-1, 1]) z(s, n * .27, .095 + e * .17, .97, .18, .156, .54, e % 2 ? "#cde8e9" : "#f1f5e8");
  for (let e = 0; e < 5; e++) {
    let n = e * Math.PI / 4;
    z(s, Math.cos(n) * .245, .45 + Math.sin(n) * .19, .97, .175, .175, .54, e % 2 ? "#d1e8e8" : "#f4f7eb").rotation.z = n;
  }
  z(s, 0, .22, .69, .36, .43, .03, "#41687c"), $s(s, .39, .015, 1.17, .95);
}

function u3(s, t = "#ed9d57") {
  vt(s, Jt([[-.63, 0, -.56], [.63, 0, -.56], [0, .84, -.56], [-.63, 0, .56], [.63, 0, .56], [0, .84, .56]], [[0, 3, 2], [3, 5, 2], [1, 2, 4], [2, 5, 4], [0, 2, 1], [3, 4, 5]]), Tt(t, {
    side: H.DoubleSide
  })), vt(s, Jt([[-.31, .016, .574], [0, .67, .574], [.31, .016, .574]], [[0, 1, 2]]), Tt("#4c6473", {
    side: H.DoubleSide
  })), it(s, [0, .85, -.6], [0, .85, .6], .018, "#dedcbd", 5);
  for (let e of [-1, 1]) for (let n of [-1, 1]) it(s, [e * .5, .2, n * .5], [e * .83, .02, n * .73], .007, "#cdd7bf", 3), z(s, e * .84, .025, n * .73, .055, .05, .055, "#6b8587");
  z(s, -.42, .16, .57, .13, .16, .02, "#f5e6bf"), z(s, -.42, .16, .586, .031, .105, .01, "#d86c52"), z(s, -.42, .16, .587, .1, .031, .01, "#d86c52");
}

function d3(s) {
  for (let e of [-1, 1]) {
    it(s, [e * .26, .055, -.62], [e * .26, .055, .54], .022, "#6f8791", 5), it(s, [e * .26, .055, .54], [e * .26, .16, .73], .022, "#6f8791", 5);
    for (let n of [-.43, .35]) Ln(s, [e * .26, .055, n], [e * .21, .26, n], .034, .034, "#c19863");
    it(s, [e * .26, .21, -.39], [e * .26, .64, -.64], .026, "#c79f65", 5);
  }
  it(s, [-.26, .64, -.64], [.26, .64, -.64], .026, "#d7b278", 5);
  for (let e = 0; e < 5; e++) z(s, -.22 + e * .11, .26, -.03, .085, .038, 1.06, e % 2 ? "#dab27b" : "#c79c62");
  z(s, 0, .41, -.18, .43, .28, .38, "#69a09b"), z(s, 0, .56, -.18, .45, .036, .4, "#83b7aa"), z(s, 0, .44, .23, .34, .22, .31, "#d8855c");
  for (let e of [-.13, .13]) Ln(s, [e, .6, -.38], [e, .6, .44], .017, .017, "#eed4a0");
  let t = gt(s, 0, .72, -.17, .115, .37, "#e9d6ac", 8);
  t.rotation.z = Math.PI / 2;
}

function f3(s, t = "#eaa66a", e = 1) {
  let n = ft(s, 0, 0, 0, e);
  return Kt(n, 0, .13, 0, .18, .24, t, 8, .11), gt(n, 0, .23, 0, .1, .14, gn.cream, 8), Kt(n, 0, .36, 0, .1, .13, t, 8, .035), Yi(n, 0, .47, 0, .046, .01, "#526b70"), n;
}

function p3(s) {
  let t = (c, l, h, u) => s.place("beach", c, l, h, u);
  s.addPath("beach", [[2.77, -4.1], [2.57, -2.6], [2.92, -1.1], [2.93, .4], [2.63, 2.1], [2.82, 4]], .075, "#e6f0d0", .041), s.addPath("beach", [[-.5, -4.2], [-.8, -2.3], [-.45, -.7], [.15, .5], [1.2, 1.2], [2.2, 1.2]], .55, "#e8c785"), t(1.4, -2, s3, {
    heading: -.37
  }), s.addCollider("beach", 1.4, -2, .76);
  let e = [[-2, 1.8, "#e87964"], [-3.15, -.65, "#6ababb"], [-1.5, -2.6, "#edbd62"], [.55, 3.3, "#e89582"]];
  for (let [c, l, h] of e) t(c, l, u => e3(u, .7, h)), t(c - .45, l + .68, u => nx(u, h), {
    heading: -.2
  }), t(c + .4, l + .7, u => nx(u, h), {
    heading: .18
  }), t(c + .03, l + .72, u => {
    gt(u, 0, .18, 0, .15, .035, gn.cream, 10), gt(u, 0, .095, 0, .026, .17, gn.wood, 6), gt(u, -.045, .242, .03, .036, .08, "#ef9e63", 6), it(u, [-.045, .28, .03], [-.04, .35, .05], .006, gn.cream, 3);
  });
  for (let [c, l, h, u] of [[-4.1, -2.6, 2.75, 0], [-3.65, -3.4, 2.1, .6], [-4.2, .9, 2.5, .9], [-2.85, 3.65, 2.45, 2.7], [1.6, -4.3, 2.55, .7], [2.1, -3.8, 2, 2.2], [1.2, 4.35, 2.7, 1.3]]) t(c, l, d => Yr(d, 0, 0, h, u, 0)), s.addCollider("beach", c, l, .2);
  for (let c = 0; c < 17; c++) t(1.94 + c * .137, 1.2, l => {
    z(l, 0, .22, 0, .123, .075, .81, c % 3 ? "#caa578" : "#dfb780");
  });
  for (let c of [2, 2.85, 3.7, 4.13]) for (let l of [.8, 1.6]) t(c, l, h => {
    gt(h, 0, .23, 0, .052, .78, "#927857", 7), gt(h, 0, .64, 0, .068, .065, "#d7bc8a", 7), qi(h, 0, .69, 0, .054);
  });
  t(3.91, 1.18, c => qi(c, .04, .29, -.02, .135));
  let n,
    i = 0,
    r = -1,
    a = -20,
    o = t(1.22, 1.24, c => {
      for (let l of [-.28, .28]) gt(c, l, .67, 0, .055, 1.34, "#a17c50", 7);
      z(c, 0, 1.33, 0, .73, .09, .12, "#c89b61"), n = ft(c, 0, 1.22, 0), it(n, [0, 0, 0], [0, -.11, 0], .021, "#6a715c", 5), Kt(n, 0, -.23, 0, .17, .25, "#e4b75e", 10, .075), Yi(n, 0, -.365, 0, .167, .025, "#b98741", !0), it(n, [0, -.33, 0], [0, -.7, 0], .012, "#e4d4aa", 4), pt(n, 0, -.73, 0, .035, .052, .035, "#d5ad62", 0), Zd(c, -.3, .59, .057, .16), ue(n, l => {
        i = l, n.rotation.z = l < r ? Math.sin((l - (r - 7)) * 7.6) * Math.max(0, r - l) / 7 * .43 : 0;
      });
    });
  t(4.17, 2.03, c => {
    let {
      group: l
    } = r3(c);
    ue(l, h => {
      let u = h - a,
        d = u >= 0 && u < 16,
        f = d ? Math.min(1, u / 16) * pe : 0;
      l.position.set(d ? Math.sin(f) * .66 : 0, .04 + Math.sin(h * 1.3) * .026, d ? (1 - Math.cos(f)) * .65 : 0), l.rotation.y = d ? f + Math.PI / 2 : -.24, l.rotation.z = Math.sin(h * .84) * .048;
    });
  }, {
    heading: .2
  }), s.addLandmark({
    id: "beach-harbor-bell",
    biome: "beach",
    label: "Harbor bell",
    action: "Ring the bell",
    description: "Send the little sailboat around the cove.",
    x: 1.22,
    z: 1.24,
    radius: 2.3,
    object: o,
    activate() {
      return r = i + 7, a = i, "Ding! The little sailboat is exploring the cove.";
    }
  }), t(3.7, -2.05, c => ix(c, "#eebd58"), {
    heading: .47
  }), t(4.17, -.32, c => {
    let l = ix(c, "#ee8570");
    ue(l, h => {
      l.position.y = .065 + Math.sin(h * .85) * .025, l.rotation.z = Math.sin(h * .67 + 1) * .035;
    });
  }, {
    heading: -1.1
  });
  for (let c = 0; c < 3; c++) t(4.38 + c % 2 * .43, -3.2 + c * 1.08, l => {
    Y1(l, 0, 0, ["#df7863", "#79bdae", "#efc261"][c], c * 2.1).scale.setScalar(1.35);
  });
  t(-.38, 2.8, c => {
    Kt(c, 0, .15, 0, .29, .29, "#dcb371", 8, .27);
    for (let l of [-1, 1]) for (let h of [-1, 1]) {
      gt(c, l * .22, .2, h * .22, .105, .4, "#e4c07c", 7);
      for (let u = 0; u < 4; u++) {
        let d = u * Math.PI / 2;
        z(c, l * .22 + Math.cos(d) * .083, .435, h * .22 + Math.sin(d) * .083, .049, .068, .049, "#e6c480");
      }
    }
    z(c, 0, .1, .296, .085, .15, .013, "#ad8752"), it(c, [0, .3, 0], [0, .69, 0], .009, "#95784e", 3), vt(c, Jt([[0, .7, 0], [.16, .63, 0], [0, .58, 0]], [[0, 1, 2]]), Tt("#ed9272", {
      side: H.DoubleSide
    })), Kt(c, .5, .08, .08, .076, .15, "#e88860", 8, .1), Yi(c, .5, .18, .08, .075, .008, "#f5d78c");
  }), t(-3.22, 1.83, c => {
    for (let l = 0; l < 3; l++) {
      let h = ft(c, (l - 1) * .22, .55, 0, 1, .13);
      pt(h, 0, 0, 0, .125, .61, .047, ["#edaa62", "#f2d77c", "#73baba"][l], 1), z(h, 0, .05, .043, .025, .73, .012, gn.cream);
    }
    z(c, 0, .2, -.05, .88, .04, .36, "#b99264");
  });
  for (let c = 0; c < 4; c++) t(-.85 + c * .55, 4.02 + c % 2 * .2, l => {
    let h = z(l, 0, .026, 0, .36, .022, .66, c % 2 ? "#83bbb6" : "#e4a075");
    for (let u = 0; u < 4; u++) z(l, 0, .039, -.25 + u * .16, .36, .01, .026, gn.cream);
  }, {
    heading: c * .33
  });
  for (let c = 0; c < 18; c++) {
    let l = -4.3 + c * .5,
      h = 2.06 + Math.sin(c * 1.8) * .33;
    t(h, l, u => c % 4 === 0 ? i3(u, c % 2 ? "#df956d" : "#edb68b", .5 + c % 3 * .1) : n3(u, .5 + c % 3 * .16), {
      heading: c * 1.7
    });
  }
  for (let c = 0; c < 19; c++) {
    let l = c * .67,
      h = -2.5 + Math.cos(l) * 1.85,
      u = Math.sin(l) * 4;
    Math.hypot(h, u) < 1.2 || t(h, u, d => {
      Qn(d, -.07, .01, "#b5b870", 1.35, 0), Qn(d, .05, -.03, "#98aa64", 1, 0), c % 3 === 0 && Ot(d, -.12, .04, .09, .14, .065, .1, "#c5b795");
    });
  }
  for (let [c, l, h] of [[2.2, -.34, .3], [1.87, 3.22, 1.6], [-.38, 3.7, -.8], [2.4, -3.1, .3]]) t(c, l, u => K1(u, 0, 0, 0, 1.1), {
    heading: h
  });
  for (let c = 0; c < 3; c++) t(1 + c * 1.6, -2.7 + c * .9, l => A0(l, 0, 3.2 + c * .2, 0, 1.35, c * 2.3));
}

function m3(s) {
  let t = (c, l, h, u) => s.place("ocean", c, l, h, u),
    e;
  t(-1.7, -2, c => {
    e = l3(c);
  }, {
    heading: -.25
  }), s.addCollider("ocean", -1.7, -2, 1.1);
  for (let [c, l, h, u] of [[-2.5, -2.9, .68, .31], [-.7, -2.82, .49, .25], [-2.8, -1.3, .55, .19], [-1.44, -3.1, .62, .32]]) t(c, l, d => {
    Ot(d, 0, -.03, 0, h, u, h * .82, "#9fab9c"), Ot(d, .07, u * .56, .02, h * .6, .07, h * .57, "#c6c6a8");
  });
  t(2.63, -1.62, a3, {
    heading: -.59
  });
  let n = !1,
    i,
    r,
    a = t(.66, 1.1, c => {
      let l = ft(c);
      for (let d = 0; d < 6; d++) {
        let f = gt(l, -.39 + d * .156, .08, 0, .092, 1.02, d % 2 ? "#b6a477" : "#c4b489", 7);
        f.rotation.x = Math.PI / 2;
      }
      for (let d of [-.37, .37]) z(l, 0, .15, d, 1.04, .05, .073, "#6c9490");
      z(l, 0, .3, -.08, .38, .36, .26, "#508b91");
      let h = z(l, 0, .505, -.08, .4, .045, .3, "#d4dec1");
      h.rotation.x = .16, i = Tt("#f9ce78", {
        emissive: "#6fefce",
        emissiveIntensity: 0
      }).clone();
      let u = gt(l, .1, .551, -.08, .052, .024, i, 8);
      u.userData.dynamic = !0, gt(l, -.1, .541, -.07, .056, .035, "#eab25e", 8), it(l, [0, .36, -.19], [0, .87, -.19], .013, "#d5dfbe", 5);
      for (let d = 0; d < 3; d++) it(l, [-.1 - d * .045, .8 - d * .1, -.19], [.1 + d * .045, .8 - d * .1, -.19], .008, "#d1dfc3", 4);
      Zd(l, -.46, .17, .05, .15).rotation.y = Math.PI / 2, qi(l, .32, .18, .25, .07), ue(l, d => {
        l.position.y = Math.sin(d * .73) * .025, l.rotation.z = Math.sin(d * .51) * .017;
      }), r = Yi(c, 0, .006, 0, .7, .018, new H.MeshBasicMaterial({
        color: "#acffe1",
        transparent: !0,
        opacity: 0,
        depthWrite: !1
      }), !0, 28), ue(r, d => {
        let f = d * .22 % 1;
        r.scale.setScalar(1 + f * 1.2), r.material.opacity = n ? (1 - f) * .4 : 0;
      });
    });
  s.addLandmark({
    id: "ocean-reef-lighthouse",
    biome: "ocean",
    label: "Reef lighthouse",
    action: "Light the lighthouse",
    description: "A little solar console lights the lighthouse and the reef.",
    x: .66,
    z: 1.1,
    radius: 2.65,
    object: a,
    activate() {
      return n = !n, e.setLit(n), i.emissiveIntensity = n ? 2 : 0, n ? "The lighthouse is shining. Watch its beam sweep the reef." : "The lighthouse is resting in the sea breeze.";
    }
  });
  for (let c = 0; c < 5; c++) t(1.1 + c * .65, -3.47 + Math.sin(c * .7) * .31, l => {
    let h = f3(l, c % 2 ? "#70bdb2" : "#edb35e", .77);
    ue(h, u => {
      h.position.y = Math.sin(u + c) * .025, h.rotation.z = Math.sin(u * .65 + c) * .07;
    });
  });
  let o = [[-3, 2.2], [-2.3, 3], [-.9, 3.58], [.4, 3.8], [2, 3.27], [3.4, 2.25], [-3.65, .35], [3.7, .35]];
  for (let c = 0; c < o.length; c++) {
    let [l, h] = o[c];
    t(l, h, u => {
      pt(u, 0, .05, 0, .39, .16, .32, c % 2 ? "#91bca2" : "#a6c1aa", 1);
    }, {
      lift: -.5
    });
    for (let u = 0; u < 3; u++) {
      let d = u * 2.2 + c,
        f = l + Math.cos(d) * .27,
        p = h + Math.sin(d) * .27;
      t(f, p, x => o3(x, ["#ec8d80", "#dfb26c", "#bba0ce", "#70c4b1"][(c + u) % 4], .34 + c % 3 * .09, u + c), {
        lift: -.44
      });
    }
    t(l - .41, h + .17, u => {
      for (let d = 0; d < 3; d++) {
        let f = (d - 1) * .11,
          p = .22 + d % 2 * .12;
        gt(u, f, p / 2, d % 2 * .05, .06, p, c % 2 ? "#dfbb74" : "#d9a581", 7), gt(u, f, p + .001, d % 2 * .05, .038, .012, "#7d7c75", 7);
      }
    }, {
      lift: -.43
    }), t(l + .4, h - .15, u => c3(u, .38 + c % 3 * .08), {
      lift: -.45
    });
  }
  for (let c = 0; c < 18; c++) {
    let l = c * 2.399,
      h = 1.6 + c % 5 * .43,
      u = Math.cos(l) * h,
      d = Math.sin(l) * h;
    t(u, d, f => {
      let p = Xd(f, 0, 0, 0, ["#f6c271", "#e79182", "#99e0c9", "#9bb9dd"][c % 4], .57 + c % 3 * .1);
      ue(p, x => {
        let m = x * .4 + c;
        p.position.set(Math.sin(m) * .2, Math.sin(x * .81 + c) * .02, Math.cos(m) * .22), p.rotation.y = m + Math.PI / 2;
      });
    }, {
      lift: -.22 - c % 3 * .07,
      heading: c * .78
    });
  }
  for (let c = 0; c < 3; c++) t(-3.6 + c * 3.2, -.13 + c % 2 * 2.1, l => {
    let h = q1(l, 0, 0, 0, .75 + c % 2 * .11);
    ue(h, u => {
      let d = u * .2 + c;
      h.position.set(Math.sin(d) * .36, Math.sin(u * .6 + c) * .024, Math.cos(d) * .27), h.rotation.y = d + Math.PI / 2;
    });
  }, {
    lift: -.31
  });
  t(-2.35, 1.2, c => T0(c, 0, 0, 0, 1.08), {
    lift: -.19
  }), t(1.72, 2.23, c => T0(c, 0, 0, 0, .83), {
    lift: -.17,
    heading: 1.7
  });
  for (let c = 0; c < 12; c++) {
    let l = c * 2.399;
    t(Math.cos(l) * (4.1 + c % 2 * .4), Math.sin(l) * 4, h => Ot(h, 0, 0, 0, .21 + c % 3 * .06, .1, .16, "#a9c2b1"), {
      lift: -.47
    });
  }
  for (let c = 0; c < 3; c++) t(-2.1 + c * 1.8, -2.8 + c * 1.4, l => A0(l, 0, 3.5 + c * .4, 0, 1.4, c * 1.8));
}

function g3(s) {
  let t = (a, o, c, l) => s.place("arctic", a, o, c, l);
  s.addPath("arctic", [[-3, .7], [-1.5, .7], [-.4, .35], [.4, .7], [1.25, 1.2], [2.6, 2.15]], .52, "#d1e9e9");
  let e = [[-3.85, -2.6, 1.85, .59], [-3.15, -3.1, 2.62, .7], [-2.38, -3.63, 2.1, .56], [-1.18, -4.04, 2.9, .76], [-.37, -3.3, 1.61, .49], [.68, -3.91, 2.38, .63], [1.79, -3.38, 3.02, .73], [2.76, -3.33, 1.77, .51], [3.51, -2.42, 2.32, .62], [3.96, -.99, 1.67, .48], [-4.07, -.49, 1.3, .46], [3.4, 3.16, 1.49, .55]];
  for (let a = 0; a < e.length; a++) {
    let [o, c, l, h] = e[a];
    t(o, c, u => sx(u, l, h, a % 3 ? "#80c9df" : "#66b5d0"), {
      heading: a * .86
    }), s.addCollider("arctic", o, c, h * .8), a % 2 === 0 && t(o + .52, c + .3, u => sx(u, l * .32, h * .45, "#aadfea"), {
      heading: a
    });
  }
  t(-2.65, -.43, h3, {
    heading: .27
  }), s.addCollider("arctic", -2.65, -.43, .95), t(2.67, -.74, a => u3(a, "#efa56a"), {
    heading: -.52
  }), s.addCollider("arctic", 2.67, -.74, .64), t(3, .85, a => {
    wn(a, -.2, .015, -.08, 1.55), gs(a, .22, 0, .07, 1.3, "#668c92"), $s(a, -.2, .32, -.08, 1.08);
  }), t(2.4, 2.3, d3, {
    heading: .75
  }), t(-3.45, 1.35, a => {
    gt(a, 0, .09, 0, .095, .18, "#a4bfc1", 9), Yi(a, 0, .21, 0, .08, .01, "#789295"), Xd(a, .025, .25, 0, "#8fabb7", .31).rotation.x = Math.PI / 2, it(a, [.23, 0, .14], [.21, .57, -.02], .022, "#997b58", 5), it(a, [.21, .57, -.02], [.07, .75, -.18], .01, "#8f8c68", 4), it(a, [.07, .75, -.18], [.04, .006, -.25], .004, "#b6ced0", 3);
  }), t(-3.45, 1.02, a => {
    gt(a, 0, .005, 0, .3, .024, "#497e97", 12), Yi(a, 0, .033, 0, .3, .029, "#f3fcf1", !0);
  });
  for (let a = 0; a < 13; a++) {
    let o = -2.23 + a * .29,
      c = .9 + Math.sin(a * .25) * .43;
    t(o, c, l => {
      pt(l, -.05, .009, -.06, .046, .008, .079, "#bddbe0", 0), pt(l, .06, .009, .09, .046, .008, .079, "#bddbe0", 0);
    }, {
      heading: 1.5
    });
  }
  let n = !1,
    i,
    r = t(1.18, 1.12, a => {
      gt(a, 0, .08, 0, .33, .16, "#a7c4c7", 8), Kt(a, 0, .27, 0, .24, .28, "#6699a4", 6, .16);
      for (let c of [-1, 1]) it(a, [c * .16, .28, 0], [c * .21, .73, 0], .043, "#dceee2", 6, .03);
      Yi(a, 0, .74, 0, .23, .025, "#dbeee0"), i = Tt("#b4e7d5", {
        emissive: "#61e5c6",
        emissiveIntensity: .12,
        roughness: .36
      }).clone();
      let o = Ot(a, 0, .73, 0, .15, .27, .15, i, 0);
      o.rotation.set(0, .22, .12), ue(o, c => {
        o.rotation.y = c * (n ? .7 : .14), i.emissiveIntensity = n ? 1.4 + Math.sin(c * 1.8) * .35 : .12;
      }), z(a, 0, .395, .18, .15, .07, .06, "#e8bb6b");
    });
  t(0, -.75, a => {
    let o = ft(a);
    for (let c = 0; c < 3; c++) {
      let l = [],
        h = [];
      for (let p = 0; p <= 18; p++) {
        let x = p / 18,
          m = -3.9 + x * 7.8,
          g = 4 + Math.sin(x * 5.4 + c * .62) * .42 + c * .17,
          y = Math.cos(x * 4.6 + c * .4) * .63 + c * .4;
        l.push([m, g, y], [m, g + .57 + Math.sin(x * 8 + c) * .22, y + .06]), p && h.push([p * 2 - 2, p * 2 - 1, p * 2], [p * 2 - 1, p * 2 + 1, p * 2]);
      }
      let d = new H.MeshBasicMaterial({
          color: ["#7be4bc", "#74cddd", "#b3a4eb"][c],
          transparent: !0,
          opacity: 0,
          side: H.DoubleSide,
          depthWrite: !1,
          blending: H.AdditiveBlending
        }),
        f = vt(o, Jt(l, h), d);
      f.castShadow = !1, ue(f, p => {
        f.position.y = Math.sin(p * .22 + c) * .12, f.rotation.y = Math.sin(p * .14 + c) * .045, d.opacity = n ? .19 + Math.sin(p * .49 + c) * .035 : 0;
      });
    }
  }), s.addLandmark({
    id: "arctic-aurora-beacon",
    biome: "arctic",
    label: "Aurora beacon",
    action: "Wake the aurora",
    description: "Turn the ice crystal to paint ribbons across the polar sky.",
    x: 1.18,
    z: 1.12,
    radius: 2.4,
    object: r,
    activate() {
      return n = !n, n ? "The crystal is awake. An aurora is dancing over the ice." : "The aurora fades gently into the polar sky.";
    }
  });
  for (let [a, o, c, l] of [[-1, -1.5, 1.5, .88], [-.07, -1.28, .9, .32], [3.3, 3.83, 1.15, -1.1]]) t(a, o, h => Wd(h, 0, .02, 0, c), {
    heading: l
  }), s.addCollider("arctic", a, o, .26 * c);
  for (let a = 0; a < 5; a++) t(-3.18 + a * 1.31, 3.35 + Math.sin(a * 1.6) * .38, o => {
    rx(o, .9, .12), Yd(o, 0, .14, 0, .95 + a % 2 * .24, a * .7);
  }, {
    lift: -.015,
    heading: a * .8
  });
  for (let a = 0; a < 18; a++) {
    let o = a * pe / 18,
      c = 4.3 + a % 3 * .19;
    t(Math.cos(o) * c, Math.sin(o) * c, l => {
      rx(l, .41 + a % 4 * .13, .12 + a % 2 * .045);
    }, {
      heading: a * 1.8
    });
  }
  for (let a = 0; a < 11; a++) {
    let o = a * 2.399,
      c = 2.75 + a % 3 * .35;
    t(Math.cos(o) * c, Math.sin(o) * c, l => {
      Ot(l, 0, .025, 0, .25 + a % 3 * .07, .065, .18, "#e8f3ea"), Ot(l, .13, .024, .06, .11, .045, .08, "#cde6e9");
    }, {
      heading: o
    });
  }
  for (let [a, o, c] of [[2.1, -1.9, "#e79563"], [-3.85, .8, "#80beb5"], [1.75, 2.87, "#ebbd6c"]]) t(a, o, l => {
    it(l, [0, 0, 0], [0, 1.03, 0], .018, "#92a9a4", 5);
    let h = ft(l, 0, .98, 0);
    vt(h, Jt([[0, 0, 0], [.32, -.055, .02], [.27, -.22, .01], [0, -.17, 0]], [[0, 1, 2], [0, 2, 3]]), Tt(c, {
      side: H.DoubleSide
    })), ue(h, u => {
      h.rotation.y = Math.sin(u * 1.7 + a) * .18;
    });
  });
}

function ox(s) {
  let t = [],
    e = {
      ...s,
      place(...i) {
        let r = s.place(...i);
        return t.push(r), r;
      }
    };
  p3(e), m3(e), g3(e);
  let n = [];
  for (let i of t) i.traverse(r => {
    r.isGroup && r.userData.dynamic && n.push(r);
  });
  for (let i of n.reverse()) Je(i, !0);
}

function x3(s, t, e, n = 0) {
  let a = [[0, e], [t * .45, e * .74], [t * .76, e * .38]].map(([h, u], d) => Array.from({
      length: 6
    }, (f, p) => {
      let x = p * pe / 6 + n,
        m = 1 + Math.sin(p * 2.7 + n) * .13;
      return [Math.cos(x) * u * m + d * .07, h + Math.sin(p * 2.4) * t * .025, Math.sin(x) * u * m];
    })),
    o = [],
    c = [],
    l = ["#8b9a87", "#a6b09c", "#b9bba6", "#91a394", "#a2ada0", "#c0c2ab"];
  for (let h = 0; h < 2; h++) for (let u = 0; u < 6; u++) {
    let d = (u + 1) % 6;
    o.push(a[h][u], a[h][d], a[h + 1][u], a[h][d], a[h + 1][d], a[h + 1][u]);
    let f = new H.Color(l[(u + h) % l.length]);
    for (let p = 0; p < 6; p++) c.push([f.r, f.g, f.b]);
  }
  vt(s, Jt(o, null, c), Tt("#ffffff", {
    vertexColors: !0
  }));
  for (let h = 0; h < 6; h++) vt(s, Jt([a[2][h], a[2][(h + 1) % 6], [.19, t, -.035]], [[0, 1, 2]]), h % 3 ? "#e5e9d6" : "#cadbcf");
  for (let h = 0; h < 4; h++) {
    let u = h * 2.4 + n;
    Ot(s, Math.cos(u) * e * .73, .1, Math.sin(u) * e * .73, e * .29, .21, e * .25, h % 2 ? "#8c9b83" : "#b1b39a");
  }
}

function _3(s) {
  z(s, 0, .44, 0, .92, .87, .88, "#bd915b");
  for (let t = 0; t < 8; t++) z(s, -.408 + t * .116, .44, .449, .012, .84, .014, "#d7ae73"), z(s, .469, .44, -.376 + t * .107, .014, .83, .012, "#d0a26c");
  Zr(s, 1.2, 1.19, .89, 1.44, "#557565");
  for (let t of [-1, 1]) it(s, [t * .61, .89, .603], [0, 1.455, .603], .026, "#e0c28b", 5);
  z(s, .13, .36, .46, .28, .68, .026, "#715b43"), z(s, .205, .36, .484, .025, .022, .01, "#e9c873"), Js(s, -.23, .58, .465, .19, .21), z(s, .27, 1.3, -.23, .16, .61, .18, "#9a9981"), z(s, .27, 1.62, -.23, .21, .05, .23, "#b9b49a");
  for (let t of [-1, 1]) z(s, t * .36, .1, .7, .13, .2, .12, "#9e794f");
  z(s, 0, .22, .7, .95, .05, .28, "#c89d65");
  for (let t = 0; t < 5; t++) xs(s, -.61, .1 + Math.floor(t / 2) * .11, -.05 + t % 2 * .11, .44, .066, Math.PI / 2);
}

function v3(s, t = 0) {
  for (let e = 0; e < 7; e++) {
    let n = e * 2.399,
      i = e ? .12 : 0,
      r = Math.cos(n) * i,
      a = Math.sin(n) * i,
      o = .39 + (e + t) % 4 * .055,
      c = Math.sin(e + t) * .037;
    it(s, [r, 0, a], [r + c, o, a], .009, "#c6a556", 3);
    let l = Kt(s, r + c, o + .075, a, .037, .17, (e + t) % 3 ? "#e9c873" : "#f2d997", 5, .011);
    l.rotation.z = -c * 1.5;
    for (let h of [-1, 1]) vt(s, Jt([[r, o * .5, a], [r + h * .085, o * .69, a + .022], [r + h * .031, o * .41, a]], [[0, 1, 2]]), Tt("#c0b16b", {
      side: H.DoubleSide
    })), it(s, [r + c + h * .025, o + .09, a], [r + c + h * .04, o + .205, a], .003, "#f4d691", 3);
  }
}

function y3(s, t = "#578d51", e = 1.95) {
  it(s, [0, 0, 0], [.055, e * .72, 0], .081, "#957247", 6, .038);
  for (let n = 0; n < 3; n++) {
    let i = n * 2.1;
    it(s, [.02, e * .45, 0], [Math.cos(i) * .37, e * .75, Math.sin(i) * .3], .039, "#a07c4d", 5, .014);
  }
  pt(s, 0, e * .76, 0, .62, .54, .57, t, 1), pt(s, -.26, e * .9, -.12, .34, .28, .35, "#72a663", 0);
  for (let n = 0; n < 8; n++) {
    let i = n * 2.39,
      r = e * (.61 + n % 3 * .1),
      a = n % 3 === 0 ? .43 : .48;
    pt(s, Math.cos(i) * a, r, Math.sin(i) * a, .048, .052, .047, n % 3 ? "#d28a51" : "#e4b766", 0);
  }
}

function M3(s, t = .52) {
  let e = gt(s, 0, t * .53, 0, t * .53, t * .85, "#d2b66b", 12);
  e.rotation.z = Math.PI / 2;
  for (let n of [-1, 1]) {
    let i = gt(s, n * t * .436, t * .53, 0, t * .495, .016, "#e9ca7e", 12);
    i.rotation.z = Math.PI / 2;
    for (let r = 1; r < 4; r++) {
      let a = vt(s, new H.TorusGeometry(t * r * .11, .009, 3, 12), "#c8a65c", n * t * .45, t * .53, 0);
      a.rotation.y = Math.PI / 2;
    }
  }
  for (let n of [-t * .23, t * .23]) {
    let i = vt(s, new H.TorusGeometry(t * .54, .013, 3, 12), "#ad965b", n, t * .53, 0);
    i.rotation.y = Math.PI / 2;
  }
}

function b3(s, t = 2.65, e = .9, n = .49) {
  let i = e / 2,
    r = n / 2,
    a = [[-i, 0, -r], [i, 0, -r], [-i, 0, r], [i, 0, r], [-i * .76, t * .76, -r * .82], [i * .62, t * .9, -r * .78], [-i * .57, t, r * .59], [i * .28, t * .87, r * .79]],
    o = [[[0, 1, 4], [1, 5, 4]], [[2, 6, 3], [3, 6, 7]], [[0, 4, 2], [2, 4, 6]], [[1, 3, 5], [3, 7, 5]], [[4, 5, 6], [5, 7, 6]]],
    c = ["#c7935d", "#dfad6e", "#b88050", "#d59f62", "#efc58b"];
  o.forEach((l, h) => vt(s, Jt(a, l), c[h]));
  for (let l = 0; l < 5; l++) {
    let h = t * (.13 + l * .135),
      u = 1 - h / t * .28;
    it(s, [-i * u, h, r * .99], [i * u * .74, h + .016, r * .98], .012, l % 2 ? "#ebbd81" : "#b88757", 3);
  }
  Ot(s, -.16, .13, .05, e * .82, .2, n * .98, "#d4a168");
}

function S3(s) {
  let t = ["#dfb678", "#edc990", "#d5aa6b"];
  for (let e of [-1, 1]) for (let n = 0; n < 5; n++) z(s, e * .54, .135 + n * .27, 0, .32 - n * .009, .257, .39, t[n % 3], e * .014);
  for (let e = 0; e < 9; e++) {
    let n = e * Math.PI / 9 + .012,
      i = (e + 1) * Math.PI / 9 - .012,
      r = .7,
      a = .4,
      o = 1.31,
      c = [[Math.cos(n) * r, o + Math.sin(n) * r, -.21], [Math.cos(i) * r, o + Math.sin(i) * r, -.21], [Math.cos(n) * a, o + Math.sin(n) * a, -.21], [Math.cos(i) * a, o + Math.sin(i) * a, -.21], [Math.cos(n) * r, o + Math.sin(n) * r, .21], [Math.cos(i) * r, o + Math.sin(i) * r, .21], [Math.cos(n) * a, o + Math.sin(n) * a, .21], [Math.cos(i) * a, o + Math.sin(i) * a, .21]];
    vt(s, Jt(c, [[0, 2, 1], [1, 2, 3], [4, 5, 6], [5, 7, 6], [0, 1, 4], [1, 5, 4], [2, 6, 3], [3, 6, 7]]), t[e % 3]);
  }
  for (let e of [-.54, .54]) z(s, e, .055, 0, .51, .11, .56, "#dfb778");
}

function w3(s, t = 1.8, e = .22) {
  let n = [[-t * .5, 0, -.28], [t * .5, 0, -.25], [-t * .42, 0, .36], [t * .41, 0, .32], [-t * .27, e, 0], [t * .18, e * .8, .04]];
  vt(s, Jt(n, [[0, 4, 1], [1, 4, 5]]), "#f2cb84"), vt(s, Jt(n, [[2, 3, 4], [3, 5, 4], [0, 2, 4], [1, 5, 3]]), "#e3b66e");
}

function E3(s, t = .91) {
  let e = "#789568";
  gt(s, 0, t * .48, 0, .098, t * .93, e, 7), pt(s, 0, t * .96, 0, .095, .091, .093, "#93ab76", 0);
  for (let n of [-1, 1]) {
    let i = t * (n > 0 ? .45 : .62);
    it(s, [0, i, 0], [n * .23, i, 0], .065, e, 6), it(s, [n * .23, i, 0], [n * .23, i + .23, 0], .063, "#86a272", 6, .05), pt(s, n * .23, i + .24, 0, .052, .054, .052, "#9bb282", 0);
  }
  for (let n = 0; n < 5; n++) it(s, [-.07, .14 + n * t * .14, .05], [-.084, .16 + n * t * .14, .077], .006, "#dfdab0", 3);
  ms(s, .025, 0, "#edb178", .77, t + .018);
}

function T3(s, t = 1.8, e = .48) {
  Ot(s, 0, t * .44, 0, e, t * .53, e * .72, "#88c6d8", 0).rotation.set(.035, .39, .09), Ot(s, -.09, t * .82, .018, e * .61, t * .25, e * .49, "#d5edf0", 0).rotation.set(.02, .31, .1), Ot(s, .1, .13, .08, e * 1.15, .18, e * .98, "#d2e7e7");
}

function cx(s) {
  let t = {
      forest: 0,
      farm: 0,
      desert: 0,
      arctic: 0
    },
    e = (r, a, o, c, l = {}, h = .3) => {
      let u = Math.hypot(a, o);
      return u - h < 5.7 || u > 10.2 || s.biomeAt(s.normalAt(r, a, o)).id !== r ? null : (t[r]++, s.place(r, a, o, c, l));
    },
    n = (r, a, o, c, l, h, u = c) => {
      let d = e(r, a, o, l, h, u);
      return d && s.addCollider(r, a, o, c), d;
    };
  for (let [r, a, o, c, l] of [[-1.83, -8, 2.8, 1.17, .4], [0, -8.72, 3.48, 1.35, .13], [1.98, -8.06, 2.57, 1.02, -.2]]) n("forest", r, a, c * .86, h => x3(h, o, c, l), {}, c);
  for (let r = 0; r < 2; r++) for (let a = 0; a < 8; a++) {
    let o = (r ? 1 : -1) * (3.4 + a % 3 * .78),
      c = -5.7 - Math.floor(a / 3) * .88;
    n("forest", o, c, .15, l => qr(l, 0, 0, 1.35 + a % 4 * .34, a % 3 ? "#3c895d" : "#5a9a62", 0), {
      heading: a * .6
    }, .7);
  }
  n("forest", -5.42, -4.7, .56, _3, {
    heading: .47
  }, .85);
  for (let r = 0; r < 13; r++) {
    let a = r % 2 ? -1 : 1,
      o = a * (4.5 + r % 4 * .48),
      c = -4.1 - Math.floor(r / 4) * .67;
    e("forest", o, c, l => {
      if (Jr(l, 0, 0, 1.3, 0, "#6c9e68"), r % 3 === 0) for (let h = 0; h < 3; h++) gt(l, .13 + h * .07, .043 + h % 2 * .017, .06, .012, .086 + h % 2 * .034, "#eed8ad", 5), Ot(l, .13 + h * .07, .09 + h % 2 * .034, .06, .065, .025, .065, "#cb8a5e");
    }, {
      heading: r * .8
    }, .42);
  }
  for (let r = 0; r < 3; r++) e("forest", 5.28 + r * .41, -4.46 + r * .3, a => {
    xs(a, 0, .12, 0, .76, .13, .4), Jr(a, -.2, .24, .75, 0);
  }, {
    heading: .6
  }, .55);
  for (let r = 0; r < 4; r++) {
    let a = -6.44 - r * .48,
      o = [[-2.38, a + .1], [-1.2, a], [0, a - .08], [1.2, a], [2.38, a + .12]];
    o.every(([c, l]) => s.biomeAt(s.normalAt("farm", c, l)).id === "farm") && s.addPath("farm", o, .36, r % 2 ? "#b99f61" : "#c5a86a", .02);
    for (let c = 0; c < 9; c++) {
      let l = -2.15 + c * .535,
        h = a + .026 * l * l;
      e("farm", l, h, u => v3(u, r + c), {
        heading: r * .17 + c * .08
      }, .25);
    }
  }
  for (let r = 0; r < 6; r++) {
    let a = -5.3 - r % 2 * 1.12,
      o = -4.55 + Math.floor(r / 2) * 1.45;
    n("farm", a, o, .15, c => y3(c, r % 2 ? "#568c50" : "#74a15d", 1.8 + r % 2 * .27), {
      heading: r * 1.3
    }, .65);
  }
  for (let r = 0; r < 5; r++) e("farm", -2.85 - r * .37, -6.82 + r * .32, a => M3(a, .49 + r % 2 * .11), {
    heading: .5 + r * .21
  }, .4);
  e("farm", -5.07, -4.3, r => {
    wn(r, 0, 0, 0, 1.26, !0), wn(r, .27, 0, .16, .95, !0);
  }, {
    heading: .2
  }, .52), e("farm", 3.34, -6.62, r => {
    gt(r, 0, .54, 0, .028, 1.08, "#937446", 5), it(r, [-.42, .83, 0], [.42, .83, 0], .022, "#a0834f", 5), z(r, 0, .79, 0, .2, .34, .13, "#db9262"), pt(r, 0, 1.08, 0, .1, .11, .09, "#dec18a", 0), Kt(r, 0, 1.22, 0, .18, .045, "#d6b76f", 9, .18), Kt(r, 0, 1.28, 0, .108, .1, "#e5c881", 8, .065);
    for (let a of [-1, 1]) it(r, [a * .1, .88, 0], [a * .34, .84, 0], .051, "#cf9466", 5), it(r, [a * .065, .66, 0], [a * .13, .4, 0], .043, "#839f7c", 5);
  });
  for (let [r, a, o, c, l, h] of [[-2.24, -7.83, 2.98, 1.05, .61, .4], [-.87, -8.59, 3.34, .87, .48, .17], [.54, -8.02, 2.31, .94, .52, -.18]]) n("desert", r, a, c * .48, u => b3(u, o, c, l), {
    heading: h
  }, c * .8);
  e("desert", -5.78, -3.85, S3, {}, .84) && (s.addCollider("desert", -6.32, -3.85, .22), s.addCollider("desert", -5.24, -3.85, .22));
  for (let r = 0; r < 3; r++) n("desert", -6.38 - r * .57, -4.9 + r * .7, .21, a => {
    let o = .5 + r % 2 * .39;
    gt(a, 0, o / 2, 0, .18, o, "#d9b073", 8), z(a, 0, o + .035, 0, .43, .08, .43, "#edc791"), z(a, 0, .035, 0, .43, .07, .43, "#cba16b");
  }, {}, .33);
  for (let r = 0; r < 5; r++) e("desert", 3.1 + r * .51, -6.39 - r * .28, a => w3(a, 1.31 + r % 2 * .25, .2 + r % 3 * .04), {
    heading: -.52
  }, .8);
  for (let r = 0; r < 8; r++) {
    let a = r % 2 ? -1 : 1,
      o = a * (5.8 + r % 3 * .52),
      c = -3 + Math.floor(r / 3) * 1.02;
    e("desert", o, c, l => {
      E3(l, .7 + r % 3 * .17), Qn(l, .18, .11, "#c2b37a", .64, 0);
    }, {
      heading: r * .71
    }, .37);
  }
  for (let r = 0; r < 10; r++) {
    let a = -4.5 + r * .64,
      o = -6.5 - Math.sin(r * .62) * .48;
    e("desert", a, o, c => {
      Ot(c, 0, .067, 0, .24, .09, .15, r % 2 ? "#d4a56e" : "#e1b880"), Ot(c, .23, .031, .09, .11, .045, .085, "#c69b65"), Qn(c, -.19, .09, "#c9bc82", .65, 0);
    }, {
      heading: r * .8
    }, .42);
  }
  for (let r = 0; r < 7; r++) {
    let a = 6.58 + r % 3 * .73,
      o = -3.98 + Math.floor(r / 3) * 1.21;
    r < 3 ? n("arctic", a, o, .36, c => T3(c, 1.55 + r % 2 * .46, .45), {
      heading: r
    }, .61) : e("arctic", a, o, c => {
      Ot(c, 0, .11, 0, .65, .2, .56, "#bddfe5"), Ot(c, -.05, .27, .02, .55, .09, .47, "#f0f8ed");
    }, {
      heading: r
    }, .68);
  }
  for (let r = 0; r < 3; r++) e("arctic", 6.83 + r * .39, -.36 + r * .53, a => Yd(a, 0, 0, 0, 1 + r % 2 * .15, .7 - r * .8), {}, .48);
  n("arctic", 7.12, 2.4, .34, r => Wd(r, 0, 0, 0, 1.22, -1.6), {}, .85);
  for (let r = 0; r < 6; r++) e("arctic", 8.16 + Math.sin(r * 1.7) * .34, -2.93 + r * .84, a => {
    Ot(a, 0, .07, 0, .24 + r % 3 * .1, .12, .25, "#e9f4ec"), Ot(a, .19, .03, .11, .12, .045, .12, "#afd5df");
  }, {
    heading: r
  }, .45);
  return t;
}

var Un = 14,
  Jd = Un + .025,
  fh = new H.Vector3(0, 1, 0),
  A3 = Math.PI * 2,
  Ks = Math.PI / 180;

function I0(s, t) {
  return new H.Vector3(Math.cos(s * Ks) * Math.sin(t * Ks), Math.sin(s * Ks), Math.cos(s * Ks) * Math.cos(t * Ks));
}

var ti = [{
    id: "forest",
    name: "Fernwood",
    kind: "Forest",
    tagline: "Every great adventure starts with a small step.",
    color: "#54945b",
    accent: "#a2d483",
    lat: 18,
    lon: -6,
    elevation: .25
  }, {
    id: "farm",
    name: "Clover Fields",
    kind: "Farm",
    tagline: "A little care makes a world of difference.",
    color: "#8da762",
    accent: "#e9ce79",
    lat: 29,
    lon: -73,
    elevation: .23
  }, {
    id: "desert",
    name: "Sunstone Oasis",
    kind: "Desert",
    tagline: "A quiet green secret among the golden dunes.",
    color: "#e6b767",
    accent: "#edc887",
    lat: 25,
    lon: 69,
    elevation: .26
  }, {
    id: "beach",
    name: "Shell Cove",
    kind: "Beach",
    tagline: "Leave only tiny footprints.",
    color: "#e9cf95",
    accent: "#f2ac89",
    lat: -24,
    lon: 64,
    elevation: .13
  }, {
    id: "ocean",
    name: "Tideglass Reef",
    kind: "Ocean",
    tagline: "There is a whole other world beneath the blue.",
    color: "#638f87",
    accent: "#78d6d2",
    lat: -40,
    lon: -24,
    elevation: -.68
  }, {
    id: "volcano",
    name: "Ember Heights",
    kind: "Volcano",
    tagline: "Even a sleeping mountain has stories to tell.",
    color: "#68564c",
    accent: "#f39868",
    lat: 3,
    lon: -151,
    elevation: .33
  }, {
    id: "arctic",
    name: "Northlight",
    kind: "Arctic",
    tagline: "The quietest places hold the brightest wonders.",
    color: "#d8ebe1",
    accent: "#b6deee",
    lat: 67,
    lon: 157,
    elevation: .31
  }].map((s, t) => ({
    ...s,
    index: t,
    center: I0(s.lat, s.lon)
  })),
  $d = Object.fromEntries(ti.map(s => [s.id, s]));

for (let s of ti) s.east = new H.Vector3(Math.cos(s.lon * Ks), 0, -Math.sin(s.lon * Ks)), s.south = new H.Vector3().crossVectors(s.east, s.center).normalize();

function _s(s, t = 0, e = 0) {
  let n = $d[s];
  return n.center.clone().multiplyScalar(Un).addScaledVector(n.east, t).addScaledVector(n.south, e).normalize();
}

function hx(s, t) {
  let e = $d[s],
    n = Un / Math.max(.1, t.dot(e.center));
  return {
    x: t.dot(e.east) * n,
    z: t.dot(e.south) * n
  };
}

function ux(s) {
  let t = ti[0],
    e = ti[1],
    n = -1 / 0,
    i = -1 / 0;
  for (let r of ti) {
    let a = s.dot(r.center) + .018 * Math.sin(s.x * 9 + r.index * 2.3) * Math.sin(s.y * 8 - s.z * 6 + r.index * .6);
    a > n ? (e = t, i = n, t = r, n = a) : a > i && (e = r, i = a);
  }
  return {
    best: t,
    second: e,
    gap: n - i
  };
}

function $r(s) {
  return ux(s).best;
}

function lx(s, t) {
  let e = s.elevation;
  if (s.id === "beach") {
    let {
        x: n,
        z: i
      } = hx("beach", t),
      r = 2.8 + Math.sin(i * .8) * .3,
      a = H.MathUtils.smoothstep(n, r - .5, r + .5);
    e = H.MathUtils.lerp(.14, -.28, a);
  }
  return s.id === "desert" && (e += .11 * Math.sin(t.x * 19 + t.z * 8) * Math.sin(t.y * 11 + t.z * 6)), e;
}

function Kd(s) {
  let {
      best: t,
      second: e,
      gap: n
    } = ux(s),
    i = H.MathUtils.smoothstep(n, 0, .065) * .5 + .5,
    r = lx(t, s) * i + lx(e, s) * (1 - i),
    a = .032 * Math.sin(s.x * 27 + s.y * 13) * Math.sin(s.z * 21 - s.y * 19) + .025 * Math.sin(s.x * 13 - s.z * 11 + s.y * 10);
  return Un + r + a;
}

function Hn(s) {
  return Math.max(Jd, Kd(s));
}

function ph(s) {
  return Kd(s) < Jd - .025;
}

function dx() {
  let s = new H.Group();
  s.name = "Little Planet";
  let t = new H.Group();
  s.add(t);
  let e = [],
    n = [],
    i = [],
    r = 49281,
    a = (M = 0, A = 1) => (r = r * 1664525 + 1013904223 >>> 0, M + (A - M) * r / 4294967296),
    o = new H.IcosahedronGeometry(Un, 40),
    c = o.getAttribute("position"),
    l = new Float32Array(c.count * 3),
    h = new H.Vector3(),
    u = new H.Vector3(),
    d = new H.Color();
  for (let M = 0; M < c.count; M += 3) {
    u.set(0, 0, 0);
    for (let _ = 0; _ < 3; _++) h.fromBufferAttribute(c, M + _).normalize(), u.add(h), h.multiplyScalar(Kd(h)), c.setXYZ(M + _, h.x, h.y, h.z);
    u.normalize();
    let A = $r(u);
    d.set(A.color).multiplyScalar(a(.92, 1.045)), A.id === "beach" && ph(u) && d.set("#8cbcac").multiplyScalar(a(.95, 1.05)), A.id === "ocean" && M % 15 === 0 && d.multiplyScalar(1.12);
    for (let _ = 0; _ < 3; _++) l[(M + _) * 3] = d.r, l[(M + _) * 3 + 1] = d.g, l[(M + _) * 3 + 2] = d.b;
  }
  o.setAttribute("color", new H.Float32BufferAttribute(l, 3)), o.computeVertexNormals(), o.computeBoundingSphere();
  let f = new H.Mesh(o, Tt("#ffffff", {
    vertexColors: !0,
    roughness: .99
  }));
  f.receiveShadow = !0, f.castShadow = !0, s.add(f);
  let p = new H.IcosahedronGeometry(Jd, 34),
    x = new Float32Array(p.attributes.position.count * 3);
  for (let M = 0; M < p.attributes.position.count; M += 3) {
    h.fromBufferAttribute(p.attributes.position, M).normalize();
    let A = Jd - Kd(h);
    d.set(A < .38 ? "#54d0c1" : "#299caf").multiplyScalar(a(.95, 1.04));
    for (let _ = 0; _ < 3; _++) x[(M + _) * 3] = d.r, x[(M + _) * 3 + 1] = d.g, x[(M + _) * 3 + 2] = d.b;
  }
  p.setAttribute("color", new H.Float32BufferAttribute(x, 3));
  let m = new H.Mesh(p, Tt("#ffffff", {
    vertexColors: !0,
    transparent: !0,
    opacity: .55,
    depthWrite: !1,
    roughness: .4,
    metalness: .025
  }));
  m.renderOrder = 3, m.receiveShadow = !1, s.add(m);
  let g = {
    root: t,
    rand: a,
    normalAt: _s,
    surfaceRadius: Hn,
    biomeAt: $r,
    place(M, A, _, w, C = {}) {
      let I = new H.Group();
      I.name = M + "-prop";
      let D = _s(M, A, _);
      I.position.copy(D).multiplyScalar(Hn(D) + (C.lift || 0)), I.quaternion.setFromUnitVectors(fh, D);
      let F = $d[M],
        G = F.east.clone().addScaledVector(D, -F.east.dot(D)).normalize(),
        L = new H.Vector3().crossVectors(G, D).normalize();
      return I.quaternion.setFromRotationMatrix(new H.Matrix4().makeBasis(G, D, L)), C.heading && I.rotateY(C.heading), C.scale && I.scale.setScalar(C.scale), t.add(I), w?.(I), I;
    },
    addLandmark(M) {
      let A = $d[M.biome],
        _ = {
          radius: 2.5,
          ...M,
          normal: _s(M.biome, M.x, M.z),
          color: A.accent,
          completed: !1
        };
      return e.push(_), _;
    },
    addCollider(M, A, _, w) {
      n.push({
        normal: _s(M, A, _),
        radius: w,
        biome: M
      });
    },
    addPath(M, A, _ = .7, w = "#cab78a", C = .035) {
      let I = [];
      for (let L = 0; L < A.length - 1; L++) {
        let W = A[L],
          V = A[L + 1],
          J = Math.max(2, Math.ceil(Math.hypot(V[0] - W[0], V[1] - W[1]) / .22));
        for (let nt = 0; nt < J; nt++) {
          let ht = nt / J;
          I.push([H.MathUtils.lerp(W[0], V[0], ht), H.MathUtils.lerp(W[1], V[1], ht)]);
        }
      }
      I.push(A[A.length - 1]);
      let D = [],
        F = [];
      for (let L = 0; L < I.length; L++) {
        let W = I[Math.max(0, L - 1)],
          V = I[Math.min(I.length - 1, L + 1)],
          J = V[0] - W[0],
          nt = V[1] - W[1],
          ht = Math.hypot(J, nt) || 1;
        for (let et of [-1, 1]) {
          let mt = _s(M, I[L][0] - nt / ht * _ * .5 * et, I[L][1] + J / ht * _ * .5 * et);
          mt.multiplyScalar(Hn(mt) + C), D.push(mt.toArray());
        }
        L && F.push([L * 2 - 2, L * 2 - 1, L * 2], [L * 2 - 1, L * 2 + 1, L * 2]);
      }
      let G = new H.Mesh(Jt(D, F), Tt(w, {
        side: H.DoubleSide,
        roughness: .94
      }));
      return G.receiveShadow = !0, t.add(G), G;
    }
  };
  ex(g), ox(g), cx(g);
  let y = [["forest", "farm"], ["forest", "desert"], ["forest", "beach"], ["farm", "volcano"], ["desert", "arctic"], ["beach", "ocean"], ["ocean", "volcano"], ["arctic", "volcano"]];
  for (let [M, A] of y) {
    let _ = _s(M, 0, 2.8),
      w = _s(A, 0, 2.8),
      C = Math.acos(H.MathUtils.clamp(_.dot(w), -1, 1)),
      I = Math.floor(C * Un / .52);
    for (let D = 0; D <= I; D++) {
      let F = D / I;
      if (F < .16 || F > .84) continue;
      let G = _.clone().multiplyScalar(Math.sin((1 - F) * C)).addScaledVector(w, Math.sin(F * C)).normalize();
      if (ph(G) || n.some(J => G.angleTo(J.normal) * Un < J.radius + .5)) continue;
      let L = new H.Group();
      L.position.copy(G).multiplyScalar(Hn(G) + .025), L.quaternion.setFromUnitVectors(fh, G), t.add(L);
      let W = $r(G).id === "arctic" ? "#9bbdc7" : $r(G).id === "volcano" ? "#b69472" : "#dbca99",
        V = Ot(L, 0, 0, 0, a(.12, .18), .025, a(.14, .21), W);
      if (V.rotation.y = a(0, A3), D % 7 === 0) {
        let J = Kt(L, .22, .1, 0, .028, .18, "#7b8c58", 4);
        J.rotation.z = .3;
      }
    }
  }
  let S = Math.PI * (3 - Math.sqrt(5));
  for (let M = 0; M < 1450; M++) {
    let A = 1 - 2 * (M + .5) / 1450,
      _ = Math.sqrt(1 - A * A),
      w = M * S,
      C = new H.Vector3(Math.cos(w) * _, A, Math.sin(w) * _);
    if (ph(C)) continue;
    let I = $r(C),
      D = hx(I.id, C);
    if (Math.hypot(D.x, D.z) < 5.7 || n.some(G => C.angleTo(G.normal) * Un < G.radius + .3)) continue;
    let F = new H.Group();
    F.position.copy(C).multiplyScalar(Hn(C)), F.quaternion.setFromUnitVectors(fh, C), t.add(F), I.id === "forest" && M % 3 === 0 ? (qr(F, 0, 0, a(1, 1.95), M % 2 ? "#2f7857" : "#438c61", 0), n.push({
      normal: C.clone(),
      radius: .17,
      biome: I.id
    })) : I.id === "farm" && M % 11 === 0 ? (Ot(F, 0, .52, 0, .66, .56, .64, "#4d8b50", 1), it(F, [0, 0, 0], [0, .55, 0], .08, "#8e6244", 5)) : I.id === "desert" ? M % 5 === 0 ? Ot(F, 0, .1, 0, .34, .22, .25, "#c28d52") : Ot(F, 0, 0, 0, .11, .045, .08, "#f1ce8a") : I.id === "volcano" ? Ot(F, 0, .055, 0, a(.11, .29), a(.08, .28), a(.11, .32), M % 2 ? "#756459" : "#3d4844") : I.id === "arctic" ? M % 6 === 0 ? Ot(F, 0, .26, 0, .22, .5, .18, "#a9d9df") : Ot(F, 0, .01, 0, .16, .055, .13, "#edf4e7") : I.id === "beach" && M % 5 === 0 ? Yr(F, 0, 0, a(1.5, 2.2), w, 0) : (Qn(F, 0, 0, I.id === "farm" ? "#b3c777" : "#82b666", a(.65, 1.3), 0), M % 5 === 0 && Ot(F, .06, .16, .03, .045, .048, .045, M % 2 ? "#edc677" : "#dab0aa"));
  }
  let v = new H.Group();
  v.userData.dynamic = !0, s.add(v);
  for (let M = 0; M < 9; M++) {
    let A = I0(18 + Math.sin(M * 1.6) * 35, M * 43 + 80),
      _ = new H.Group();
    _.position.copy(A).multiplyScalar(Un + 3.4 + a(0, .8)), _.quaternion.setFromUnitVectors(fh, A), _.scale.setScalar(.8), v.add(_);
    let w = Tt("#eef1db", {
      transparent: !0,
      opacity: .42,
      depthWrite: !1,
      roughness: 1
    });
    for (let C = 0; C < 4; C++) {
      let I = Ot(_, (C - 1.5) * .38, Math.sin(C * 1.5) * .12, Math.sin(C * 3) * .12, .54, .27 + a(0, .13), .37, w, 1);
      I.castShadow = !1, I.renderOrder = 5;
    }
  }
  i.push(M => {
    v.rotation.y = M * .006;
  });
  let T = Tt("#f5d58c", {
    emissive: "#dfb44e",
    emissiveIntensity: .18
  });
  for (let M of e) {
    let A = new H.Group();
    A.userData.dynamic = !0, A.position.copy(M.normal).multiplyScalar(Hn(M.normal)), A.quaternion.setFromUnitVectors(fh, M.normal), s.add(A);
    let _ = new H.Mesh(new H.TorusGeometry(.28, .023, 4, 24), Tt(M.color, {
      emissive: M.color,
      emissiveIntensity: .12
    }));
    _.rotation.x = Math.PI / 2, _.position.y = .07, A.add(_);
    let w = Kt(A, 0, 1.65, 0, .115, .23, T, 4),
      C = Kt(A, 0, 1.5, 0, .115, .16, T, 4);
    C.rotation.x = Math.PI, M.marker = A, M.ring = _, i.push(I => {
      w.position.y = 1.64 + Math.sin(I * 2 + M.normal.x * 4) * .09, C.position.y = w.position.y - .18, w.rotation.y = I * .6, C.rotation.y = I * .6, w.visible = C.visible = !M.completed, _.scale.setScalar(M.completed ? .6 : 1 + Math.sin(I * 2) * .05);
    });
  }
  return Je(t), s.updateMatrixWorld(!0), {
    root: s,
    terrain: f,
    water: m,
    landmarks: e,
    colliders: n,
    ctx: g,
    update(M) {
      for (let A of i) A(M);
    },
    stats: {
      triangles: C3(s),
      colliders: n.length,
      landmarks: e.length
    }
  };
}

function C3(s) {
  let t = 0;
  return s.traverse(e => {
    e.isMesh && (t += (e.geometry.index ? e.geometry.index.count : e.geometry.attributes.position.count) / 3);
  }), Math.round(t);
}

function fx(s) {
  let t = 27,
    e = () => ((t = t * 16807 % 2147483647) - 1) / 2147483646,
    n = [],
    i = [];
  for (let c = 0; c < 420; c++) {
    let l = I0(Math.asin(e() * 2 - 1) / Ks, e() * 360);
    l.multiplyScalar(70 + e() * 18), n.push(l.x, l.y, l.z);
    let h = new H.Color(c % 8 === 0 ? "#e2bd76" : c % 3 === 0 ? "#9ebecb" : "#d8e0d5").multiplyScalar(.35 + e() * .45);
    i.push(h.r, h.g, h.b);
  }
  let r = new H.BufferGeometry();
  r.setAttribute("position", new H.Float32BufferAttribute(n, 3)), r.setAttribute("color", new H.Float32BufferAttribute(i, 3));
  let a = new H.Points(r, new H.PointsMaterial({
    size: .075,
    sizeAttenuation: !0,
    vertexColors: !0,
    transparent: !0,
    opacity: .72,
    depthWrite: !1
  }));
  s.add(a);
  let o = new H.Mesh(new H.SphereGeometry(Un + 1, 64, 48), new H.ShaderMaterial({
    transparent: !0,
    side: H.BackSide,
    depthWrite: !1,
    uniforms: {
      color: {
        value: new H.Color("#65bfc0")
      }
    },
    vertexShader: "varying vec3 world;varying vec3 outward;void main(){vec4 p=modelMatrix*vec4(position,1.0);world=p.xyz;outward=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}",
    fragmentShader: "uniform vec3 color;varying vec3 world;varying vec3 outward;void main(){float rim=pow(1.0-abs(dot(normalize(outward),normalize(cameraPosition-world))),3.2);gl_FragColor=vec4(color,rim*.085);}"
  }));
  o.renderOrder = 6, s.add(o);
}

export function createLittlePlanetModel() {
  y0.length = 0;
  const model = dx();
  const atmosphere = new THREE.Group();
  fx(atmosphere);
  return { ...model, atmosphere };
}
