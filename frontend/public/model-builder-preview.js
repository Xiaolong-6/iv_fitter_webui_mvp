(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const canvas = $("canvas");
  const viewport = $("viewport");
  const svg = $("svg");

  const W = 120, H = 60, TERM = 28, GRID = 20, PAD = 18, EXIT = 32, GAP = 8, WIRE_GAP = 12, CONNECT_SNAP_PX = 24;
  const SIDES = ["top", "right", "bottom", "left"];
  const DIR = { top:[0,-1], right:[1,0], bottom:[0,1], left:[-1,0] };

  const S = {
    nodes: [],
    conns: [],
    selected: null,
    drag: null,
    view: { x:0, y:0, scale:1 },
    nextNode: 1,
    nextConn: 1
  };

  const node = id => S.nodes.find(n => n.id === id);
  const conn = id => S.conns.find(c => c.id === id);
  const clone = pts => pts.map(p => ({ x:p.x, y:p.y }));
  const snap = v => Math.round(v / GRID) * GRID;
  let lastStateSignature = "";

  function screen(e) {
    const r = canvas.getBoundingClientRect();
    return { x:e.clientX - r.left, y:e.clientY - r.top };
  }

  function world(e) {
    const p = screen(e);
    return { x:(p.x - S.view.x) / S.view.scale, y:(p.y - S.view.y) / S.view.scale };
  }


  function nodeRectForMessage(n) {
    const r = n.el.getBoundingClientRect();
    const cr = canvas.getBoundingClientRect();
    return { x:r.left - cr.left, y:r.top - cr.top, width:r.width, height:r.height };
  }

  function postToParent(message) {
    window.parent?.postMessage(message, window.location.origin);
  }

  function postSelectionCleared() {
    postToParent({ type:"ivfitter:preview-selection-cleared" });
  }

  function postComponentSelected(n) {
    if (!n || n.terminal) return;
    postToParent({
      type:"ivfitter:preview-component-selected",
      component:componentForMessage(n),
      rect:nodeRectForMessage(n)
    });
  }

  function postComponentAdded(n) {
    if (!n || n.terminal) return;
    postToParent({
      type:"ivfitter:preview-component-added",
      component:componentForMessage(n),
      rect:nodeRectForMessage(n)
    });
  }

  function postComponentDeleted(n) {
    if (!n || n.terminal) return;
    postToParent({ type:"ivfitter:preview-component-deleted", id:n.id });
  }

  function componentForMessage(n) {
    return {
      id:n.id,
      label:n.label,
      templateName:n.templateName || n.label,
      behavior:n.behavior || "I_of_V",
      expression:n.expression || "",
      parameters:Array.isArray(n.parameters) ? n.parameters : [],
      rect:nodeRectForMessage(n)
    };
  }

  function snapshotState() {
    return {
      version:1,
      view:{ ...S.view },
      nextNode:S.nextNode,
      nextConn:S.nextConn,
      nodes:S.nodes.map(n => ({
        id:n.id,
        label:n.label,
        templateName:n.templateName,
        behavior:n.behavior,
        expression:n.expression,
        parameters:Array.isArray(n.parameters) ? n.parameters : [],
        x:n.x,
        y:n.y,
        w:n.w,
        h:n.h,
        terminal:n.terminal,
        protected:n.protected,
        side:n.side || null
      })),
      conns:S.conns.map(c => ({
        id:c.id,
        from:c.from,
        fromSide:c.fromSide,
        to:c.to,
        toSide:c.toSide,
        manual:c.manual ? clone(c.manual) : null
      }))
    };
  }

  function postStateChanged(force = false) {
    const state = snapshotState();
    const signature = JSON.stringify(state);
    if (!force && signature === lastStateSignature) return;
    lastStateSignature = signature;
    postToParent({ type:"ivfitter:preview-state-changed", state });
  }

  function applyView() {
    viewport.style.transform = `translate(${S.view.x}px,${S.view.y}px) scale(${S.view.scale})`;
    const zoomLabel = $("zoomLabel");
    if (zoomLabel) zoomLabel.textContent = `${Math.round(S.view.scale * 100)}%`;
  }

  function zoomTo(next, anchor = null) {
    const old = S.view.scale;
    const scale = Math.max(0.25, Math.min(3, next));
    if (scale === old) return;

    anchor ??= { x:canvas.clientWidth / 2, y:canvas.clientHeight / 2 };
    const w = { x:(anchor.x - S.view.x) / old, y:(anchor.y - S.view.y) / old };

    S.view.scale = scale;
    S.view.x = anchor.x - w.x * scale;
    S.view.y = anchor.y - w.y * scale;
    applyView();
  }

  function autoFit() {
    if (!S.nodes.length) {
      S.view = { x:0, y:0, scale:1 };
      applyView();
      return;
    }

    const pad = 100;
    const minX = Math.min(...S.nodes.map(n => n.x));
    const minY = Math.min(...S.nodes.map(n => n.y));
    const maxX = Math.max(...S.nodes.map(n => n.x + n.w));
    const maxY = Math.max(...S.nodes.map(n => n.y + n.h));
    const cw = Math.max(1, maxX - minX);
    const ch = Math.max(1, maxY - minY);
    const scale = Math.max(0.25, Math.min(2, (canvas.clientWidth - pad * 2) / cw, (canvas.clientHeight - pad * 2) / ch));

    S.view.scale = scale;
    S.view.x = (canvas.clientWidth - cw * scale) / 2 - minX * scale;
    S.view.y = (canvas.clientHeight - ch * scale) / 2 - minY * scale;
    applyView();
  }

  function handle(n, side) {
    if (n.terminal) return { x:n.x + n.w / 2, y:n.y + n.h / 2 };
    if (side === "top") return { x:n.x + n.w / 2, y:n.y };
    if (side === "right") return { x:n.x + n.w, y:n.y + n.h / 2 };
    if (side === "bottom") return { x:n.x + n.w / 2, y:n.y + n.h };
    return { x:n.x, y:n.y + n.h / 2 };
  }

  function exitPoint(p, side) {
    const [dx, dy] = DIR[side];
    return { x:p.x + dx * EXIT, y:p.y + dy * EXIT };
  }

  function rectAt(x, y, w, h, pad = 0) {
    return { x1:x - pad, y1:y - pad, x2:x + w + pad, y2:y + h + pad };
  }

  function rect(n, pad = PAD) {
    return rectAt(n.x, n.y, n.w, n.h, pad);
  }

  function overlap(a, b) {
    return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
  }

  function freePosition(id, x, y, w, h) {
    const r = rectAt(x, y, w, h, GAP);
    return S.nodes.every(n => n.id === id || !overlap(r, rectAt(n.x, n.y, n.w, n.h))) && wireClearForNode(id, r);
  }

  function nearestFree(id, x, y, w, h) {
    if (freePosition(id, x, y, w, h)) return { x, y };

    for (let radius = 1; radius <= 30; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;

          const nx = x + dx * 16;
          const ny = y + dy * 16;

          if (freePosition(id, nx, ny, w, h)) return { x:nx, y:ny };
        }
      }
    }

    return { x, y };
  }

  function inside(p, r) {
    return p.x >= r.x1 && p.x <= r.x2 && p.y >= r.y1 && p.y <= r.y2;
  }

  function segHitsRect(a, b, r) {
    if (inside(a, r) || inside(b, r)) return true;

    if (a.y === b.y) {
      return a.y >= r.y1 && a.y <= r.y2 &&
        Math.max(a.x,b.x) >= r.x1 && Math.min(a.x,b.x) <= r.x2;
    }

    if (a.x === b.x) {
      return a.x >= r.x1 && a.x <= r.x2 &&
        Math.max(a.y,b.y) >= r.y1 && Math.min(a.y,b.y) <= r.y2;
    }

    return true;
  }

  function segmentsOf(points) {
    const pts = clean(points);
    const segs = [];

    for (let i = 1; i < pts.length; i++) {
      if (pts[i - 1].x !== pts[i].x || pts[i - 1].y !== pts[i].y) {
        segs.push([pts[i - 1], pts[i]]);
      }
    }

    return segs;
  }

  function wireClearForNode(id, r) {
    for (const c of S.conns) {
      if (c.from === id || c.to === id) continue;
      for (const [a, b] of segmentsOf(route(c, c.id))) {
        if (segHitsRect(a, b, r)) return false;
      }
    }

    return true;
  }

  function pointOnSegment(p, a, b) {
    if (a.x === b.x) {
      return p.x === a.x && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
    }

    if (a.y === b.y) {
      return p.y === a.y && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x);
    }

    return false;
  }

  function segsTooClose(a, b, c, d) {
    // Same orientation: reject if they are parallel and too close while overlapping.
    if (a.y === b.y && c.y === d.y) {
      const overlap = Math.max(Math.min(a.x,b.x), Math.min(c.x,d.x)) <= Math.min(Math.max(a.x,b.x), Math.max(c.x,d.x));
      return overlap && Math.abs(a.y - c.y) < WIRE_GAP;
    }

    if (a.x === b.x && c.x === d.x) {
      const overlap = Math.max(Math.min(a.y,b.y), Math.min(c.y,d.y)) <= Math.min(Math.max(a.y,b.y), Math.max(c.y,d.y));
      return overlap && Math.abs(a.x - c.x) < WIRE_GAP;
    }

    // Perpendicular: reject real crossings. Allow touching exactly at endpoints only.
    const h1 = a.y === b.y;
    const h2 = c.y === d.y;
    const hA = h1 ? a : c;
    const hB = h1 ? b : d;
    const vA = h1 ? c : a;
    const vB = h1 ? d : b;
    const cross = vA.x >= Math.min(hA.x,hB.x) && vA.x <= Math.max(hA.x,hB.x) &&
                  hA.y >= Math.min(vA.y,vB.y) && hA.y <= Math.max(vA.y,vB.y);

    if (!cross) return false;

    const crossPoint = { x:vA.x, y:hA.y };
    const endpointTouch =
      (crossPoint.x === a.x && crossPoint.y === a.y) ||
      (crossPoint.x === b.x && crossPoint.y === b.y) ||
      (crossPoint.x === c.x && crossPoint.y === c.y) ||
      (crossPoint.x === d.x && crossPoint.y === d.y);

    return !endpointTouch;
  }

  let collectingWireObstacles = false;

  function wireObstacleSegments(exceptConnId = null) {
    if (collectingWireObstacles) return [];

    const segs = [];
    collectingWireObstacles = true;

    for (const c of S.conns) {
      if (c.id === exceptConnId) continue;
      for (const seg of segmentsOf(route(c, c.id))) segs.push(seg);
    }

    collectingWireObstacles = false;
    return segs;
  }

  function clean(pts) {
    let out = [];

    for (const p of pts) {
      const q = out[out.length - 1];
      if (!q || q.x !== p.x || q.y !== p.y) out.push({ x:p.x, y:p.y });
    }

    let changed = true;
    while (changed) {
      changed = false;

      for (let i = 1; i < out.length - 1;) {
        const a = out[i - 1], b = out[i], c = out[i + 1];

        if ((a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y)) {
          out.splice(i, 1);
          changed = true;
        } else {
          i++;
        }
      }

      for (let i = 0; i < out.length - 3; i++) {
        const a = out[i], b = out[i + 1], c = out[i + 2], d = out[i + 3];
        const hSpike = a.y === b.y && b.x === c.x && c.y === d.y && a.y === d.y;
        const vSpike = a.x === b.x && b.y === c.y && c.x === d.x && a.x === d.x;

        if (hSpike || vSpike) {
          out.splice(i + 1, 2);
          changed = true;
          break;
        }
      }
    }

    return out;
  }

  function pathD(pts) {
    return "M " + clean(pts).map(p => `${Math.round(p.x)} ${Math.round(p.y)}`).join(" L ");
  }

  function segClear(a, b, ignore = [], exceptConnId = null) {
    if (a.x !== b.x && a.y !== b.y) return false;

    const boxesClear = S.nodes.every(n => {
      if (ignore.includes(n.id)) return true;
      return !segHitsRect(a, b, rect(n));
    });

    if (!boxesClear) return false;

    for (const [c, d] of wireObstacleSegments(exceptConnId)) {
      if (segsTooClose(a, b, c, d)) return false;
    }

    return true;
  }

  function pathClear(pts, ignore = [], exceptConnId = null) {
    pts = clean(pts);
    for (let i = 1; i < pts.length; i++) {
      if (!segClear(pts[i - 1], pts[i], ignore, exceptConnId)) return false;
    }
    return true;
  }

  function visibleClear(pts, c) {
    pts = clean(pts);
    for (let i = 1; i < pts.length; i++) {
      const ignore = [];
      if (i === 1) ignore.push(c.from);
      if (i === pts.length - 1) ignore.push(c.to);
      if (!segClear(pts[i - 1], pts[i], ignore, c.id)) return false;
    }
    return true;
  }

  function score(pts) {
    pts = clean(pts);
    let length = 0;
    let bends = 0;

    for (let i = 1; i < pts.length; i++) {
      length += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);

      if (i >= 2) {
        const a = pts[i - 2], b = pts[i - 1], c = pts[i];
        if ((a.y === b.y) !== (b.y === c.y)) bends++;
      }
    }

    return length + bends * 12;
  }

  function best(paths, ignore = [], exceptConnId = null) {
    return paths
      .filter(p => pathClear(p, ignore, exceptConnId))
      .sort((a, b) => score(a) - score(b))[0] || null;
  }

  function orth(a, b, ignore = [], exceptConnId = null) {
    const hv = clean([a, { x:b.x, y:a.y }, b]);
    const vh = clean([a, { x:a.x,y:b.y }, b]);
    return best([hv, vh], ignore, exceptConnId) || hv;
  }

  function zPath(a, b, axis, v) {
    return axis === "x"
      ? clean([a, { x:v, y:a.y }, { x:v, y:b.y }, b])
      : clean([a, { x:a.x, y:v }, { x:b.x, y:v }, b]);
  }

  function endpoints(c) {
    const a0 = handle(node(c.from), c.fromSide);
    const b0 = handle(node(c.to), c.toSide);
    return { a0, a:exitPoint(a0, c.fromSide), b:exitPoint(b0, c.toSide), b0 };
  }

  function manualRoute(a, b, manual, ignore, exceptConnId = null) {
    if (!manual?.length) return null;
    const first = manual[0];
    const last = manual[manual.length - 1];

    return clean([
      ...orth(a, first, ignore, exceptConnId),
      ...manual.slice(1),
      ...orth(last, b, ignore, exceptConnId).slice(1)
    ]);
  }

  function candidates(a, b, c) {
    const list = [];
    const ignore = [c.from, c.to];

    if (a.x === b.x || a.y === b.y) list.push([a, b]);

    list.push(
      clean([a, { x:b.x, y:a.y }, b]),
      clean([a, { x:a.x, y:b.y }, b])
    );

    const xs = new Set([snap((a.x+b.x)/2), snap(a.x+100), snap(a.x-100), snap(b.x+100), snap(b.x-100)]);
    const ys = new Set([snap((a.y+b.y)/2), snap(a.y+100), snap(a.y-100), snap(b.y+100), snap(b.y-100)]);

    for (const n of S.nodes) {
      if (ignore.includes(n.id)) continue;
      const r = rect(n, PAD + GRID);
      xs.add(snap(r.x1 - GRID)); xs.add(snap(r.x2 + GRID));
      ys.add(snap(r.y1 - GRID)); ys.add(snap(r.y2 + GRID));
    }

    for (const x of xs) list.push(zPath(a, b, "x", x));
    for (const y of ys) list.push(zPath(a, b, "y", y));

    const outsideX = [-GRID, canvas.clientWidth / S.view.scale + GRID];
    const outsideY = [-GRID, canvas.clientHeight / S.view.scale + GRID];
    for (const x of outsideX) list.push(zPath(a, b, "x", x));
    for (const y of outsideY) list.push(zPath(a, b, "y", y));

    return list;
  }

  function route(c, exceptConnId = c.id) {
    const { a0, a, b, b0 } = endpoints(c);
    const ignore = [c.from, c.to];

    if (c.manual) {
      const m = manualRoute(a, b, c.manual, ignore, exceptConnId);
      if (m && pathClear(m, ignore, exceptConnId)) return clean([a0, ...m, b0]);
    }

    const m = best(candidates(a, b, c), ignore, exceptConnId) || orth(a, b, ignore, exceptConnId);
    return clean([a0, ...m, b0]);
  }

  function usedSides(id) {
    const sides = new Set();
    for (const c of S.conns) {
      if (c.from === id) sides.add(c.fromSide);
      if (c.to === id) sides.add(c.toSide);
    }
    return sides;
  }

  function sideVisible(id, side) {
    const n = node(id);
    if (!n || n.terminal) return true;

    const used = usedSides(id);
    return used.has(side) || used.size < 2;
  }

  function sideConnectable(id, side) {
    const n = node(id);
    if (!n) return false;

    const used = usedSides(id);
    if (n.terminal) return true;

    return used.has(side) || used.size < 2;
  }

  function nearestConnectDot(e) {
    const source = S.drag?.type === "connect" ? S.drag.from : null;
    let bestDot = null;
    let bestDistance = Infinity;

    for (const dot of document.querySelectorAll(".dot:not(.hidden)")) {
      const el = dot.closest(".node");
      if (!el) continue;

      const id = el.dataset.id;
      const side = dot.dataset.side;

      if (id === source) continue;
      if (!sideConnectable(id, side)) continue;

      const r = dot.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = Math.hypot(e.clientX - cx, e.clientY - cy);

      if (d < bestDistance) {
        bestDistance = d;
        bestDot = dot;
      }
    }

    return bestDistance <= CONNECT_SNAP_PX ? bestDot : null;
  }

  function clearTargets() {
    document.querySelectorAll(".dot.target").forEach(d => d.classList.remove("target"));
  }

  function updateConnectTarget(e) {
    clearTargets();
    if (!S.drag || S.drag.type !== "connect") return;

    const dot = nearestConnectDot(e);
    S.drag.target = null;

    if (!dot) return;

    const el = dot.closest(".node");
    S.drag.target = { id:el.dataset.id, side:dot.dataset.side };
    dot.classList.add("target");
  }

  function editableHandles(pts) {
    pts = clean(pts);
    const hs = [];

    for (let i = 1; i < pts.length - 2; i++) {
      const a = pts[i];
      const b = pts[i + 1];

      if (a.x === b.x) hs.push({ x:a.x, y:(a.y+b.y)/2, axis:"x", segment:i });
      else if (a.y === b.y) hs.push({ x:(a.x+b.x)/2, y:a.y, axis:"y", segment:i });
    }

    return hs;
  }

  function moveSegment(middle, index, axis, value) {
    const pts = clean(middle);
    const last = pts.length - 1;
    if (index < 0 || index >= last) return pts;

    const out = clone(pts);
    const move = p => axis === "x" ? { x:value, y:p.y } : { x:p.x, y:value };
    const a = move(pts[index]);
    const b = move(pts[index + 1]);

    if (index === 0) out.splice(1, 0, a);
    else out[index] = a;

    if (index + 1 === last) out.splice(index === 0 ? index + 2 : index + 1, 0, b);
    else out[index + 1 + (index === 0 ? 1 : 0)] = b;

    return clean(out);
  }

  function addNode(label, x, y, opt = {}) {
    const terminal = opt.terminal === true;
    const w = opt.w || (terminal ? TERM : W);
    const h = opt.h || (terminal ? TERM : H);
    const id = opt.id || `n${S.nextNode++}`;
    const numericId = Number(String(id).replace(/^\D+/, ""));
    if (Number.isFinite(numericId)) S.nextNode = Math.max(S.nextNode, numericId + 1);
    const free = nearestFree(id, x, y, w, h);

    x = free.x;
    y = free.y;

    const el = document.createElement("div");
    el.className = terminal ? "node terminal" : "node box";
    el.dataset.id = id;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;

    if (terminal) {
      const labelEl = document.createElement("div");
      labelEl.className = "terminal-label";
      labelEl.textContent = label;
      el.appendChild(labelEl);
    } else {
      el.textContent = label;
    }

    const sides = terminal ? [opt.side || "right"] : SIDES;

    for (const side of sides) {
      const dot = document.createElement("div");
      dot.className = terminal ? "dot" : `dot ${side}`;
      dot.dataset.side = side;

      dot.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.stopPropagation();

        if (!sideConnectable(id, side)) return;

        S.selected = null;
        postSelectionCleared();
        S.drag = {
          type:"connect",
          from:id,
          fromSide:side,
          start:handle(node(id), side),
          end:world(e),
          target:null
        };

        updateConnectTarget(e);
        render();
      });

      el.appendChild(dot);
    }

    el.addEventListener("pointerdown", e => {
      if (e.target.classList.contains("dot")) return;

      e.preventDefault();
      e.stopPropagation();

      const p = world(e);
      const n = node(id);

      S.selected = { type:"node", id };
      S.drag = {
        type:"node",
        id,
        dx:p.x - n.x,
        dy:p.y - n.y,
        startX:n.x,
        startY:n.y,
        desiredX:n.x,
        desiredY:n.y,
        moved:false
      };

      postSelectionCleared();
      render();
    });

    viewport.appendChild(el);

    S.nodes.push({
      id,
      label,
      templateName:opt.templateName || label,
      behavior:opt.behavior || (terminal ? "" : "I_of_V"),
      expression:opt.expression || "",
      parameters:Array.isArray(opt.parameters) ? opt.parameters : [],
      side:opt.side || null,
      x, y, w, h,
      el,
      terminal,
      protected: opt.protected === true
    });

    render();
    if (!terminal && !opt.silent) postComponentAdded(S.nodes[S.nodes.length - 1]);
    return id;
  }

  function addBox() {
    const center = {
      x:(canvas.clientWidth / 2 - S.view.x) / S.view.scale,
      y:(canvas.clientHeight / 2 - S.view.y) / S.view.scale
    };

    return addNode(`box${S.nextNode}`, center.x - W / 2 + S.nodes.length * 12, center.y - H / 2 + S.nodes.length * 12);
  }

  function addTerminal(label, x, y, side) {
    return addNode(label, x, y, { terminal:true, protected:true, side });
  }

  function addConn(from, fromSide, to, toSide, opt = {}) {
    if (!from || !to || from === to) return;

    const id = opt.id || `c${S.nextConn++}`;
    const numericId = Number(String(id).replace(/^\D+/, ""));
    if (Number.isFinite(numericId)) S.nextConn = Math.max(S.nextConn, numericId + 1);
    S.conns.push({ id, from, fromSide, to, toSide, manual:opt.manual ? clone(opt.manual) : null });
    S.selected = { type:"conn", id };
    render();
  }

  function clearGraph(keepTerminals = true) {
    for (const n of [...S.nodes]) {
      if (keepTerminals && n.terminal) continue;
      n.el.remove();
    }
    S.nodes = keepTerminals ? S.nodes.filter(n => n.terminal) : [];
    S.conns = [];
    S.selected = null;
    S.drag = null;
    postSelectionCleared();
    render();
  }

  function resetTerminals() {
    const cx = Math.max(220, (canvas.clientWidth / 2 - S.view.x) / S.view.scale);
    const cy = Math.max(220, (canvas.clientHeight / 2 - S.view.y) / S.view.scale);
    const v = S.nodes.find(n => n.terminal && n.label === "V");
    const gnd = S.nodes.find(n => n.terminal && n.label === "GND");
    if (v) {
      v.x = cx;
      v.y = cy - 170;
      v.el.style.left = `${v.x}px`;
      v.el.style.top = `${v.y}px`;
    }
    if (gnd) {
      gnd.x = cx;
      gnd.y = cy + 170;
      gnd.el.style.left = `${gnd.x}px`;
      gnd.el.style.top = `${gnd.y}px`;
    }
  }

  function clearCanvas() {
    clearGraph(true);
    resetTerminals();
    requestAnimationFrame(autoFit);
  }

  function loadState(state) {
    if (!state || !Array.isArray(state.nodes) || !Array.isArray(state.conns)) return;
    clearGraph(false);
    S.nextNode = Number(state.nextNode) || 1;
    S.nextConn = Number(state.nextConn) || 1;
    S.view = state.view && typeof state.view === "object" ? { x:Number(state.view.x) || 0, y:Number(state.view.y) || 0, scale:Number(state.view.scale) || 1 } : { x:0, y:0, scale:1 };

    for (const n of state.nodes) {
      addNode(String(n.label || n.id), Number(n.x) || 0, Number(n.y) || 0, {
        id:String(n.id),
        templateName:n.templateName || n.label || n.id,
        behavior:n.behavior || "",
        expression:n.expression || "",
        parameters:Array.isArray(n.parameters) ? n.parameters : [],
        w:Number(n.w) || undefined,
        h:Number(n.h) || undefined,
        terminal:Boolean(n.terminal),
        protected:Boolean(n.protected),
        side:n.side || undefined,
        silent:true
      });
    }

    if (!S.nodes.some(n => n.terminal && n.label === "V")) addTerminal("V", 160, 80, "bottom");
    if (!S.nodes.some(n => n.terminal && n.label === "GND")) addTerminal("GND", 160, 380, "top");

    for (const c of state.conns) {
      if (node(c.from) && node(c.to)) {
        addConn(String(c.from), String(c.fromSide), String(c.to), String(c.toSide), { id:String(c.id), manual:c.manual || null });
      }
    }
    S.selected = null;
    render();
    postStateChanged(true);
    requestAnimationFrame(autoFit);
  }

  function updateComponent(data) {
    const n = node(data?.id);
    if (!n || n.terminal) return;
    if (typeof data.label === "string" && data.label.trim()) {
      n.label = data.label.trim();
      n.el.textContent = n.label;
    }
    if (typeof data.templateName === "string") n.templateName = data.templateName;
    if (typeof data.behavior === "string") n.behavior = data.behavior;
    if (typeof data.expression === "string") n.expression = data.expression;
    if (Array.isArray(data.parameters)) n.parameters = data.parameters;
    render();
    postComponentSelected(n);
    postStateChanged(true);
  }

  function duplicateSelected() {
    if (S.selected?.type !== "node") return;
    const n = node(S.selected.id);
    if (!n || n.terminal) return;
    addNode(`${n.label}_copy`, n.x + 28, n.y + 28, {
      templateName:n.templateName,
      behavior:n.behavior,
      expression:n.expression,
      parameters:Array.isArray(n.parameters) ? structuredClone(n.parameters) : []
    });
  }

  function draw(tag, attrs, cls, down) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);

    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (cls) el.setAttribute("class", cls);
    if (down) el.addEventListener("pointerdown", down);

    svg.appendChild(el);
    return el;
  }



  function endpointKey(id, side) {
    const n = node(id);
    if (!n || n.terminal) return id;
    return `${id}:${side}`;
  }

  function portGraphEdges(blockedConn = null) {
    const edges = [];

    for (const c of S.conns) {
      if (c.id === blockedConn) continue;
      edges.push({
        a:endpointKey(c.from, c.fromSide),
        b:endpointKey(c.to, c.toSide),
        connId:c.id
      });
    }

    for (const n of S.nodes) {
      if (n.terminal) continue;
      const sides = [...usedSides(n.id)];
      if (sides.length < 2) continue;
      for (let i = 0; i < sides.length; i++) {
        for (let j = i + 1; j < sides.length; j++) {
          edges.push({ a:endpointKey(n.id, sides[i]), b:endpointKey(n.id, sides[j]), connId:null });
        }
      }
    }

    return edges;
  }

  function reachablePorts(start, blockedConn = null) {
    const seen = new Set([start]);
    const queue = [start];
    const edges = portGraphEdges(blockedConn);

    while (queue.length) {
      const cur = queue.shift();
      for (const edge of edges) {
        let next = null;
        if (edge.a === cur) next = edge.b;
        else if (edge.b === cur) next = edge.a;
        if (next && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }

    return seen;
  }

  function activeConnectionIds() {
    const source = S.nodes.find(n => n.terminal && n.label === "V");
    const ground = S.nodes.find(n => n.terminal && n.label === "GND");
    const active = new Set();
    if (!source || !ground || !reachablePorts(source.id).has(ground.id)) return active;

    for (const c of S.conns) {
      const fromKey = endpointKey(c.from, c.fromSide);
      const toKey = endpointKey(c.to, c.toSide);
      const fromSource = reachablePorts(source.id, c.id);
      const toGround = reachablePorts(toKey, c.id);
      const toSource = reachablePorts(source.id, c.id);
      const fromGround = reachablePorts(fromKey, c.id);
      if ((fromSource.has(fromKey) && toGround.has(ground.id)) || (toSource.has(toKey) && fromGround.has(ground.id))) {
        active.add(c.id);
      }
    }

    return active;
  }

  function voltageNetLabels(activeIds) {
    const parent = new Map();
    const ensure = key => {
      if (!parent.has(key)) parent.set(key, key);
      return key;
    };
    const find = key => {
      ensure(key);
      let cur = key;
      while (parent.get(cur) !== cur) cur = parent.get(cur);
      let walk = key;
      while (parent.get(walk) !== walk) {
        const next = parent.get(walk);
        parent.set(walk, cur);
        walk = next;
      }
      return cur;
    };
    const unite = (a, b) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(rb, ra);
    };

    const source = S.nodes.find(n => n.terminal && n.label === "V");
    const ground = S.nodes.find(n => n.terminal && n.label === "GND");
    if (source) ensure(source.id);
    if (ground) ensure(ground.id);

    for (const c of S.conns) {
      if (!activeIds.has(c.id)) continue;
      unite(endpointKey(c.from, c.fromSide), endpointKey(c.to, c.toSide));
    }

    const rootNames = new Map();
    if (source) rootNames.set(find(source.id), "Vext");
    if (ground) rootNames.set(find(ground.id), "0");

    let next = 1;
    for (const key of parent.keys()) {
      const root = find(key);
      if (!rootNames.has(root)) rootNames.set(root, `V${next++}`);
    }

    const labels = [];
    for (const c of S.conns) {
      if (!activeIds.has(c.id)) continue;
      labels.push({ id:c.from, side:c.fromSide, text:rootNames.get(find(endpointKey(c.from, c.fromSide))) });
      labels.push({ id:c.to, side:c.toSide, text:rootNames.get(find(endpointKey(c.to, c.toSide))) });
    }

    const seen = new Set();
    return labels.filter(item => {
      if (!item.text) return false;
      const key = `${item.id}:${item.side}:${item.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  let lastCircuitSignature = "";

  function render() {
    applyView();

    for (const n of S.nodes) {
      n.el.classList.toggle("selected", S.selected?.type === "node" && S.selected.id === n.id);
      n.el.classList.toggle("protected", n.protected === true);

      for (const dot of n.el.querySelectorAll(".dot")) {
        dot.classList.toggle("hidden", !sideVisible(n.id, dot.dataset.side));
      }
    }

    svg.innerHTML = "";
    const activeIds = activeConnectionIds();
    const signature = `${activeIds.size > 0}:${activeIds.size}`;
    if (signature !== lastCircuitSignature) {
      lastCircuitSignature = signature;
      postToParent({ type:"ivfitter:preview-circuit-status", connected:activeIds.size > 0, activeWireCount:activeIds.size });
    }

    for (const c of S.conns) {
      const pts = route(c);
      const selected = S.selected?.type === "conn" && S.selected.id === c.id;

      draw("path", { d:pathD(pts) }, "hit", e => {
        e.preventDefault();
        e.stopPropagation();
        S.selected = { type:"conn", id:c.id };
        render();
      });

      const active = activeIds.has(c.id);
      draw("path", { d:pathD(pts) }, selected ? "connector selected" : (active ? "connector active" : "connector"));
      if (active) draw("path", { d:pathD(pts) }, "connector-flow");

      if (selected) {
        for (const h of editableHandles(pts)) {
          draw("circle", { cx:h.x, cy:h.y, r:7 }, "mid", e => {
            e.preventDefault();
            e.stopPropagation();

            S.drag = {
              type:"mid",
              connId:c.id,
              segment:h.segment - 1,
              axis:h.axis,
              middle:clone(pts.slice(1, -1))
            };
          });
        }
      }
    }

    for (const item of voltageNetLabels(activeIds)) {
      const n = node(item.id);
      if (!n) continue;
      const p = handle(n, item.side);
      const [dx, dy] = DIR[item.side] || [1, 0];
      draw("text", {
        x:p.x + dx * 18 + (dy !== 0 ? 12 : 0),
        y:p.y + dy * 18 - (dx !== 0 ? 8 : 0)
      }, "voltage-label").textContent = item.text;
    }

    if (S.drag?.type === "connect") {
      draw("path", { d:pathD(orth(S.drag.start, S.drag.end, [S.drag.from])) }, "preview");

      if (S.drag.target) {
        const target = node(S.drag.target.id)?.el.querySelector(`.dot[data-side="${S.drag.target.side}"]`);
        target?.classList.add("target");
      }
    }
    postStateChanged();
  }

  function deleteSelected() {
    if (!S.selected) return;

    if (S.selected.type === "node") {
      const n = node(S.selected.id);

      if (n?.protected) {
        S.selected = null;
        render();
        return;
      }

      S.conns = S.conns.filter(c => c.from !== n.id && c.to !== n.id);
      n.el.remove();
      S.nodes = S.nodes.filter(x => x.id !== n.id);
      postComponentDeleted(n);
    } else if (S.selected.type === "conn") {
      S.conns = S.conns.filter(c => c.id !== S.selected.id);
    }

    S.selected = null;
    postSelectionCleared();
    render();
  }

  function updateDrag(e) {
    if (!S.drag) return;

    const p = world(e);

    if (S.drag.type === "pan") {
      S.view.x = S.drag.viewX + e.clientX - S.drag.x;
      S.view.y = S.drag.viewY + e.clientY - S.drag.y;
      applyView();
      return;
    }

    if (S.drag.type === "node") {
      const n = node(S.drag.id);
      const nx = p.x - S.drag.dx;
      const ny = p.y - S.drag.dy;

      for (const c of S.conns) {
        if (c.from === n.id || c.to === n.id) c.manual = null;
      }

      // During dragging, allow temporary overlap so nodes can pass through
      // crowded areas. Final overlap is resolved on pointerup.
      if (Math.hypot(nx - S.drag.startX, ny - S.drag.startY) > 4) S.drag.moved = true;
      n.x = nx;
      n.y = ny;
      S.drag.desiredX = nx;
      S.drag.desiredY = ny;

      n.el.style.left = `${n.x}px`;
      n.el.style.top = `${n.y}px`;
      render();
      return;
    }

    if (S.drag.type === "connect") {
      S.drag.end = p;
      updateConnectTarget(e);
      render();
      return;
    }

    if (S.drag.type === "mid") {
      const c = conn(S.drag.connId);
      const ep = endpoints(c);
      const value = S.drag.axis === "x" ? p.x : p.y;
      const manual = moveSegment(S.drag.middle, S.drag.segment, S.drag.axis, value);
      const m = manualRoute(ep.a, ep.b, manual, [c.from, c.to], c.id);

      if (!m) return;

      const visible = clean([ep.a0, ...m, ep.b0]);

      if (visibleClear(visible, c)) {
        c.manual = manual;
        render();
      }
    }
  }

  function finishDrag(e) {
    if (S.drag?.type === "connect") {
      updateConnectTarget(e);

      if (S.drag.target) {
        addConn(S.drag.from, S.drag.fromSide, S.drag.target.id, S.drag.target.side);
      }
    }

    if (S.drag?.type === "node") {
      const n = node(S.drag.id);

      if (n && !freePosition(n.id, n.x, n.y, n.w, n.h)) {
        const free = nearestFree(n.id, n.x, n.y, n.w, n.h);
        n.x = free.x;
        n.y = free.y;
        n.el.style.left = `${n.x}px`;
        n.el.style.top = `${n.y}px`;
      }
      if (n && !S.drag.moved) postComponentSelected(n);
    }

    clearTargets();
    S.drag = null;
    render();
  }

  canvas.addEventListener("pointerdown", e => {
    if (e.target !== canvas && e.target !== svg && e.target !== viewport) return;

    e.preventDefault();
    S.selected = null;
    postSelectionCleared();
    S.drag = { type:"pan", x:e.clientX, y:e.clientY, viewX:S.view.x, viewY:S.view.y };
    render();
  });

  canvas.addEventListener("wheel", e => {
    e.preventDefault();
    zoomTo(S.view.scale * (e.deltaY < 0 ? 1.12 : 1 / 1.12), screen(e));
  }, { passive:false });

  window.addEventListener("pointermove", updateDrag);
  window.addEventListener("pointerup", finishDrag);
  window.addEventListener("pointercancel", finishDrag);
  window.addEventListener("blur", () => {
    clearTargets();
    S.drag = null;
    render();
  });

  window.addEventListener("keydown", e => {
    if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
  });

  if ($("addBox")) $("addBox").onclick = addBox;
  if ($("deleteBtn")) $("deleteBtn").onclick = deleteSelected;
  if ($("zoomOutBtn")) $("zoomOutBtn").onclick = () => zoomTo(S.view.scale / 1.2);
  if ($("zoomInBtn")) $("zoomInBtn").onclick = () => zoomTo(S.view.scale * 1.2);
  if ($("fitBtn")) $("fitBtn").onclick = autoFit;

  const TEMPLATE_PREFIX = { Resistance:"R", "Shockley diode":"D", "Constant current":"I", Custom:"C" };
  function nextComponentLabel(templateName) {
    const prefix = TEMPLATE_PREFIX[templateName] || "C";
    const count = S.nodes.filter(n => !n.terminal && String(n.label).startsWith(prefix)).length;
    return prefix === "R" ? `R${count}` : `${prefix}${count + 1}`;
  }

  window.addEventListener("message", e => {
    const d = e.data;
    if (!d) return;
    if (d.type === "ivfitter:add-preview-component") {
      const wx = (d.x - S.view.x) / S.view.scale;
      const wy = (d.y - S.view.y) / S.view.scale;
      addNode(d.instanceName || nextComponentLabel(d.label), wx - W / 2, wy - H / 2, {
        templateName:d.label,
        behavior:d.behavior,
        expression:d.expression,
        parameters:Array.isArray(d.parameters) ? d.parameters : []
      });
    }
    if (d.type === "ivfitter:clear-canvas") clearCanvas();
    if (d.type === "ivfitter:load-canvas-state") loadState(d.state);
    if (d.type === "ivfitter:update-component") updateComponent(d.component);
    if (d.type === "ivfitter:duplicate-selected") duplicateSelected();
    if (d.type === "ivfitter:request-state") postStateChanged(true);
    if (d.type === "ivfitter:fit-screen") autoFit();
    if (d.type === "ivfitter:delete-selected") deleteSelected();
  });

  addTerminal("V", 160, 80, "bottom");
  addTerminal("GND", 160, 380, "top");
  requestAnimationFrame(autoFit);
})();
