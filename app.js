// ------------------------------------------------------------------
// CONFIGURACIÓN DEL MAPA DE LA PAZ (ESRI TILES)
// ------------------------------------------------------------------
const latInicial = -16.5100;
const lngInicial = -68.1300;

const map = L.map('map', {
    zoomControl: false // Ocultar control por defecto para UI más limpia
}).setView([latInicial, lngInicial], 14);

// Control de Zoom reposicionado a la derecha
L.control.zoom({ position: 'topright' }).addTo(map);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Huella Segura La Paz',
    maxZoom: 18
}).addTo(map);

const marker = L.marker([latInicial, lngInicial], { draggable: true }).addTo(map);
marker.bindPopup("<b>Punto de Extravío</b><br>Arrástrame para recalcular.").openPopup();

let circlePerimetro = null;

// ------------------------------------------------------------------
// MOTOR DE CÁLCULO NUMÉRICO
// ------------------------------------------------------------------

function f_edo(t, r, v0, alpha, thetaRad, kCaza) {
    const vNet = v0 * Math.exp(-alpha * t) * Math.cos(thetaRad) - kCaza;
    return Math.max(0.0, vNet);
}

function calcularAnalitico(tTarget, v0, alpha, thetaRad, kCaza) {
    const vHoriz = v0 * Math.cos(thetaRad);
    const tStop = (vHoriz > kCaza) ? (1.0 / alpha) * Math.log(vHoriz / kCaza) : 0;
    const tEval = Math.min(tTarget, tStop);
    const rVal = (vHoriz / alpha) * (1.0 - Math.exp(-alpha * tEval)) - kCaza * tEval;
    return { r: Math.max(0.0, rVal), vHoriz: vHoriz };
}

function resolverHeun(tTarget, h, v0, alpha, thetaRad, kCaza) {
    let t = 0.0, r = 0.0;
    const steps = Math.ceil(tTarget / h);
    let ultimoPaso = { r_i: 0, k_pred: 0, k_corr: 0, h_step: h, r_next: 0 };

    for (let i = 0; i < steps; i++) {
        const stepH = Math.min(h, tTarget - t);
        const k_pred = f_edo(t, r, v0, alpha, thetaRad, kCaza);
        const r_pred = r + stepH * k_pred;
        const k_corr = f_edo(t + stepH, r_pred, v0, alpha, thetaRad, kCaza);
        const r_next = r + (stepH / 2.0) * (k_pred + k_corr);
        
        ultimoPaso = { r_i: r, k_pred: k_pred, k_corr: k_corr, h_step: stepH, r_next: r_next };
        r = r_next;
        t += stepH;
    }
    return { rFinal: r, ultimoPaso: ultimoPaso };
}

function resolverRK4(tTarget, h, v0, alpha, thetaRad, kCaza) {
    let t = 0.0, r = 0.0;
    const steps = Math.ceil(tTarget / h);
    let ultimoPaso = { r_i: 0, k1: 0, k2: 0, k3: 0, k4: 0, h_step: h, r_next: 0 };

    for (let i = 0; i < steps; i++) {
        const stepH = Math.min(h, tTarget - t);
        const k1 = f_edo(t, r, v0, alpha, thetaRad, kCaza);
        const k2 = f_edo(t + 0.5 * stepH, r + 0.5 * stepH * k1, v0, alpha, thetaRad, kCaza);
        const k3 = f_edo(t + 0.5 * stepH, r + 0.5 * stepH * k2, v0, alpha, thetaRad, kCaza);
        const k4 = f_edo(t + stepH, r + stepH * k3, v0, alpha, thetaRad, kCaza);
        const r_next = r + (stepH / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4);
        
        ultimoPaso = { r_i: r, k1: k1, k2: k2, k3: k3, k4: k4, h_step: stepH, r_next: r_next };
        r = r_next;
        t += stepH;
    }
    return { rFinal: r, ultimoPaso: ultimoPaso };
}

// ------------------------------------------------------------------
// ACTUALIZACIÓN DE INTERFAZ Y MAPA
// ------------------------------------------------------------------
function actualizarSimulacion() {
    const tallaSel = document.getElementById('talla').value;
    const factorEstrés = parseFloat(document.getElementById('causa').value);
    const gradoPendiente = parseFloat(document.getElementById('zona').value);
    const tHoras = parseFloat(document.getElementById('tiempo').value);

    let v0Base = 2.0, alpha = 0.85;
    if (tallaSel === 'pequena') { v0Base = 1.2; alpha = 1.10; }
    if (tallaSel === 'grande')  { v0Base = 3.0; alpha = 0.70; }

    const v0 = v0Base * factorEstrés;
    const thetaRad = (gradoPendiente * Math.PI) / 180.0;
    const kCaza = 0.30;
    const pasoH = 0.5;

    const resAnalitico = calcularAnalitico(tHoras, v0, alpha, thetaRad, kCaza);
    const resHeun = resolverHeun(tHoras, pasoH, v0, alpha, thetaRad, kCaza);
    const resRK4 = resolverRK4(tHoras, pasoH, v0, alpha, thetaRad, kCaza);

    const rAnalitico = resAnalitico.r;
    const rHeun = resHeun.rFinal;
    const rRK4 = resRK4.rFinal;

    const errRK4 = rAnalitico > 0 ? (Math.abs(rAnalitico - rRK4) / rAnalitico) * 100 : 0;

    // Actualizar Panel
    document.getElementById('res-analitico').innerText = rAnalitico.toFixed(3) + " km";
    document.getElementById('res-heun').innerText = rHeun.toFixed(3) + " km";
    document.getElementById('res-rk4').innerText = rRK4.toFixed(3) + " km";
    document.getElementById('res-err-rk4').innerText = errRK4.toFixed(4) + " %";

    // Eval Fórmulas
    const vH = resAnalitico.vHoriz.toFixed(2);
    document.getElementById('formula-analitica-eval').innerHTML = 
        `r(${tHoras}h) = [${vH}/${alpha}]·(1 - e⁻⁽⁰ˑ⁸⁵ˣ${tHoras}⁾) - 0.30·${tHoras} = <b>${rAnalitico.toFixed(3)} km</b>`;

    const hPaso = resHeun.ultimoPaso;
    document.getElementById('formula-heun-eval').innerHTML = 
        `${hPaso.r_i.toFixed(3)} + (${hPaso.h_step}/2)·[${hPaso.k_pred.toFixed(2)} + ${hPaso.k_corr.toFixed(2)}] = <b>${hPaso.r_next.toFixed(3)} km</b>`;

    const rkPaso = resRK4.ultimoPaso;
    document.getElementById('formula-rk4-eval').innerHTML = 
        `${rkPaso.r_i.toFixed(3)} + (${rkPaso.h_step}/6)·[${rkPaso.k1.toFixed(2)} + 2(${rkPaso.k2.toFixed(2)}) + 2(${rkPaso.k3.toFixed(2)}) + ${rkPaso.k4.toFixed(2)}] = <b>${rkPaso.r_next.toFixed(3)} km</b>`;

    // Renderizado Perímetro Mapa
    const latLng = marker.getLatLng();
    const radioMetros = rRK4 * 1000;

    if (circlePerimetro) map.removeLayer(circlePerimetro);

    circlePerimetro = L.circle(latLng, {
        color: '#4f46e5',
        fillColor: '#6366f1',
        fillOpacity: 0.20,
        weight: 2,
        radius: radioMetros
    }).addTo(map);
}

// ------------------------------------------------------------------
// TOAST DE BIENVENIDA Y EVENTOS
// ------------------------------------------------------------------
function mostrarToastBienvenida() {
    const toast = document.getElementById('toast');
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000); // Se oculta a los 4 seg
    }, 500);
}

const sliderTiempo = document.getElementById('tiempo');
const inputTiempoNum = document.getElementById('tiempo-num');

sliderTiempo.addEventListener('input', (e) => {
    inputTiempoNum.value = e.target.value;
    actualizarSimulacion();
});

inputTiempoNum.addEventListener('input', (e) => {
    sliderTiempo.value = e.target.value;
    actualizarSimulacion();
});

document.getElementById('talla').addEventListener('change', actualizarSimulacion);
document.getElementById('causa').addEventListener('change', actualizarSimulacion);
document.getElementById('zona').addEventListener('change', actualizarSimulacion);
document.getElementById('btn-calcular').addEventListener('click', actualizarSimulacion);
marker.on('dragend', actualizarSimulacion);

// Inicio
actualizarSimulacion();
mostrarToastBienvenida();