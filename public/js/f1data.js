// console.log('f1data.js cargado');
// URL base de la API
// const API_URL = 'http://localhost:3000/api';

// URL de la API
const API_URL = `http://${window.location.hostname}:3000/api`;
// URL de los archivos estáticos de la F1
const F1_STATIC_BASE_URL = 'https://livetiming.formula1.com/static/';
// Estado del reproductor interactivo de radios
let activeAudio = null;
let activeRadioPath = null;
let lastRadiosData = null;
let currentSessionPath = '';

// --- Broadcast Delay (sync telemetry with the TV stream) ---
/** Delay in milliseconds applied before rendering incoming leaderboard data. */
let broadcastDelayMs = 0;
// Cola de los datos que llegan de la tabla de posiciones
const leaderboardQueue = [];
// Cola de los datos que llegan del panel de control de la FIA (banderas, safety car...)
const raceControlQueue = [];

// Obtener los datos y imprimirlos en pantalla
async function fetchF1Data() {
    // console.log('function fetchF1Data f1data.js');
    // return false;
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();

        // Mandar los datos despues del retraso
        if (broadcastDelayMs > 0) {
            leaderboardQueue.push({ data, readyAt: Date.now() + broadcastDelayMs });
        } else {
            renderLeaderboard(data);
        }
    } catch (error) {
        console.error('Error al obtener datos de la API:', error);
    }
}

// Vaciar las colas y cargar los datos que tienen que llegar
function drainDelayQueues() {
    const now = Date.now();

    // Mostrar el último elemento que llega del leaderboard
    let latestLeaderboard = null;
    while (leaderboardQueue.length > 0 && leaderboardQueue[0].readyAt <= now) {
        latestLeaderboard = leaderboardQueue.shift().data;
    }
    if (latestLeaderboard) renderLeaderboard(latestLeaderboard);

    // Mostrar el último elemento que llega del panel de control de la FIA
    let latestRaceControl = null;
    while (raceControlQueue.length > 0 && raceControlQueue[0].readyAt <= now) {
        latestRaceControl = raceControlQueue.shift().data;
    }
    if (latestRaceControl) updateTrackStatus(latestRaceControl);
}

// Gestionar el retraso que introduce el cliente
function applyBroadcastDelay() {
    const input = document.getElementById('broadcast-delay-input');
    const badge = document.getElementById('broadcast-delay-badge');
    const seconds = parseFloat(input.value) || 0;
    const clamped = Math.max(0, Math.min(120, seconds)); // Caparlo a 2 minutos

    broadcastDelayMs = Math.round(clamped * 1000);

    // Descartar los datos en cola que correspondan al retardo anterior
    leaderboardQueue.length = 0;
    raceControlQueue.length = 0;

    if (badge) {
        badge.textContent = broadcastDelayMs > 0 ? `⏱ ${clamped}s` : '⏱ En directo';
        badge.classList.toggle('delay-active', broadcastDelayMs > 0);
    }

    // console.log(`[BroadcastDelay] Delay set to ${broadcastDelayMs}ms`);
}

// Imprimir los datos del servidor en el frontend
function renderLeaderboard(data) {
    // console.log('function renderLeaderboard f1data.js');
    // return false;
    // console.log(data);
    // return false;
    const trTable = document.getElementById('leaderboard-tr');
    const tbody = document.getElementById('leaderboard-body');
    const sessionName = document.getElementById('sessionName');
    const lapsHtml = document.getElementById('lapsHtml');
    const selectorOptGap = document.getElementById('selOptGap');

    let gap = '';
    let compound = '';
    let tyreLaps = '';

    if (data && data.Session && data.Session.Path) {
        currentSessionPath = data.Session.Path;
    }
    let typeSession = data.Session.Type;
    // typeSession = 'Qualifying';
    // typeSession = 'Race';
    // console.log(typeSession);

    // Añadir el número de vueltas para la carrera y sprint
    if (typeSession === 'Race' || typeSession === 'Sprint') {
        lapsHtml.innerHTML = `
            <h2 class="h2NumLaps">
                <span class="numLapsText">Vuelta</span>
                <a id="currentLap">${data.LapCount.CurrentLap}</a>
                <a class="lapSeparator">/</a>
                <a id="totalLaps">${data.LapCount.TotalLaps}</a>
            </h2>
        `;
    }

    // Añadir el nombre de la sesión
    sessionName.innerHTML = `${data.Session.Meeting.OfficialName}`;

    if (typeSession === 'Race' || typeSession === 'Sprint') {

        trTable.innerHTML = `
            <tr>
                <th>Pos</th>
                <th>Piloto</th>
                <th>Equipo</th>
                <th>Diferencia</th>
                <th>Última Vuelta</th>
                <th>Mejor Vuelta</th>
                <th>Neumático</th>
                <th>Pit</th>
            </tr>
        `
    } else if (typeSession === 'Qualifying' || typeSession === 'Practice') {
        trTable.innerHTML = `
            <tr>
                <th>Pos</th>
                <th>Piloto</th>
                <th>Equipo</th>
                <th>Diferencia</th>
                <th>Sector 1</th>
                <th>Sector 2</th>
                <th>Sector 3</th>
                <th>Mejor Vuelta</th>
                <th>Neumático</th>
                <th>Pit</th>
            </tr>
        `
    }

    // Validar si existen pilotos en la sesión
    if (!data || !data.Leaderboard || data.Leaderboard.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888;">No hay coches en pista o la sesión no ha iniciado.</td></tr>`;
        return;
    }

    let rowsHtml = '';

    // $(document).on('change', '#switchGapBtn', function () {
    //     valueGap = this.value || 'driver.GapToLeader?.Value || ' - '';
    // });
    // console.log(valueGap);
    let valueGap = document.getElementById('switchGapBtn').value;
    // console.log(valueGap);

    // data.Leaderboard contiene los dorsales ordenados por posición
    data.Leaderboard.forEach((racingNumber) => {
        const driver = data.Lines[racingNumber];
        // console.log(data.Lines[racingNumber].RacingNumber);
        if (data.Lines[racingNumber].RacingNumber === '_kf') {
            return;
        }
        if (!driver) return;

        // Obtener último neumático usado si existe el array de Stints
        // En Race/Sprint llega como Array; en Qualifying/Practice como objeto {0:{...}, 1:{...}}
        // Object.values() normaliza ambos formatos a un array real
        const stintsRaw = driver.Stints;
        // const numStints = stintsRaw.length;
        // console.log(numStints);
        const stintsArray = stintsRaw
            ? (Array.isArray(stintsRaw) ? stintsRaw : Object.values(stintsRaw))
            : [];
        const currentStint = stintsArray.length > 0 ? stintsArray[stintsArray.length - 1] : null;
        compound = currentStint?.Compound || 'N/A';
        tyreLaps = currentStint ? `(${currentStint.TotalLaps || 0} v)` : '';
        if (typeSession === 'Race' || typeSession === 'Sprint') {
            if (valueGap === 'leader') {
                gap = driver.GapToLeader?.Value || driver.GapToLeader || '-';
            } else if (valueGap === 'interval') {
                gap = driver.IntervalToPositionAhead?.Value || driver.IntervalToPositionAhead || '-';
            }
        } else if (typeSession === 'Qualifying' || typeSession === 'Practice') {
            // Helper to extract sanitized string value from gap property
            const parseGap = (val) => {
                if (val === undefined || val === null) return '';
                const v = typeof val === 'object' && val.Value !== undefined ? val.Value : val;
                if (typeof v === 'string') return v.trim();
                if (typeof v === 'number') return String(v);
                return '';
            };

            if (String(driver.Position) === '1') {
                gap = 'Líder';
            } else {
                let foundGap = '';
                const statsArray = driver.Stats ? (Array.isArray(driver.Stats) ? driver.Stats : Object.values(driver.Stats)) : [];

                // En Qualifying buscamos desde la última fase hacia atrás aquella que tenga tiempos reales (no vacíos)
                // Esto garantiza que pilotos eliminados en Q1 o Q2 conserven su gap final sin mostrar '-' ni 'Líder'
                for (let i = statsArray.length - 1; i >= 0; i--) {
                    const s = statsArray[i];
                    if (!s) continue;
                    const fVal = parseGap(s.TimeDiffToFastest);
                    const aVal = parseGap(s.TimeDiffToPositionAhead ?? s.TimeDifftoPositionAhead);

                    if ((fVal && fVal !== '-') || (aVal && aVal !== '-')) {
                        const chosen = valueGap === 'leader' ? fVal : aVal;
                        foundGap = chosen || ' - ';
                        break;
                    }
                }

                // Fallback para Practice (entrenamientos libres) o cuando no hay datos en driver.Stats
                if (!foundGap) {
                    const fDirect = parseGap(driver.TimeDiffToFastest);
                    const aDirect = parseGap(driver.TimeDiffToPositionAhead ?? driver.TimeDifftoPositionAhead);
                    const chosenDirect = valueGap === 'leader' ? fDirect : aDirect;
                    if (chosenDirect && chosenDirect !== '-') {
                        foundGap = chosenDirect;
                    }
                }

                gap = foundGap || ' - ';
            }
        }
        // if (valueGap === 'leader') {
        //     var gap = driver.GapToLeader?.Value || driver.GapToLeader || '-';
        // } else if (valueGap === 'interval') {
        //     var gap = driver.IntervalToPositionAhead?.Value || driver.IntervalToPositionAhead || '-';
        // }
        const lastLap = driver.LastLapTime?.Value || '-';
        const bestLap = driver.BestLapTime?.Value || '-';
        const teamColor = driver.TeamColour ? `#${driver.TeamColour}` : '#888';
        const position = driver.Position || '-';
        const gridPosition = driver.GridPos || '-';
        const driverRetired = driver.Retired;
        // Sectores (normalizar si viene como Array u Objeto en F1 SignalR)
        const sectorsObj = driver.Sectors;
        const sector1 = sectorsObj ? (sectorsObj[0] ?? sectorsObj['0']) : null;
        const sector2 = sectorsObj ? (sectorsObj[1] ?? sectorsObj['1']) : null;
        const sector3 = sectorsObj ? (sectorsObj[2] ?? sectorsObj['2']) : null;
        // Sector 1
        var sector1Time = sector1?.Value;
        var sector1OF = sector1?.OverallFastest;
        var sector1PF = sector1?.PersonalFastest;
        // Sector 2
        var sector2Time = sector2?.Value;
        var sector2OF = sector2?.OverallFastest;
        var sector2PF = sector2?.PersonalFastest;
        // Sector 3
        var sector3Time = sector3?.Value;
        var sector3OF = sector3?.OverallFastest;
        var sector3PF = sector3?.PersonalFastest;
        // console.log(sectorsObj);
        // console.log(sector1);
        // console.log(sector1Time);
        // if (sector1OF) {
        //     console.log('Sector 1 Morado');
        // } else if (sector1PF) {
        //     console.log('Sector 1 Verde');
        // } else {
        //     console.log('Sector 1 Blanco');
        // }
        // console.log(sector2);
        // console.log(sector3);
        // console.log(position);

        // Debug para manejo de errores //
        // if (driver.RacingNumber === '44') {
        //     sector1Time = undefined;
        //     sector2Time = '';
        //     sector3Time = undefined;
        //     compound = 'N/A';
        // }
        //
        if (sector1Time === '' || sector1Time === undefined) {
            sector1Time = ' - ';
        }
        if (sector2Time === '' || sector2Time === undefined) {
            sector2Time = ' - ';
        }
        if (sector3Time === '' || sector3Time === undefined) {
            sector3Time = ' - ';
        }

        // Prueba para los colores de los sectores
        // if (racingNumber === '3') {
        //     sector1OF = true;
        // }
        // if (racingNumber === '81') {
        //     sector2PF = true;
        // }
        // if (racingNumber === '44') {
        //     sector1PF = true;
        //     sector2OF = true;
        //     sector3PF = true;
        // }
        // if (racingNumber === '16') {
        //     sector3OF = true;
        // }

        let dif = claculateDifPos(position, gridPosition);
        // console.log(dif.diferencia);
        // console.log(dif.tipo);

        let imgDif = '';
        let difPos = dif.diferencia;

        if (dif.tipo === 'positive') {
            imgDif = ARROWS_IMG + 'arrowUp.png';
        } else if (dif.tipo === 'negative') {
            imgDif = ARROWS_IMG + 'arrowDown.png';
        } else if (dif.tipo === 'equal') {
            difPos = '-';
        }

        let difHtml = '';

        if (typeSession === 'Race') {
            if (dif.tipo === 'equal') {
                difHtml = ` = `;
            } else {
                difHtml = `<img class="imgArrow" src="${imgDif}"</img> <a>${difPos}</a>`;
            }
        }

        // Gestionar el gap
        if (position === "1") { gap = 'Líder' };
        // console.log(gap);
        // console.log(pruebaGap);
        // Gestionar el gap para clasificacion y practica
        var timeToFastest = driver.TimeDiffToFastest || '-';
        // console.log(timeToFastest);
        if (timeToFastest === '-') {
            // console.log('Sin dato de timeToFastest');
        }

        var teamLogo = '';
        var tyreImg = '';
        // Añadimos el logo de la scuderia
        if (driver.TeamName === 'Red Bull Racing') {
            teamLogo = TEAM_IMAGES + 'RedBull.png';
        } else if (driver.TeamName === 'Ferrari') {
            teamLogo = TEAM_IMAGES + 'Ferrari.png';
        } else if (driver.TeamName === 'Mercedes') {
            teamLogo = TEAM_IMAGES + 'Mercedes.png';
        } else if (driver.TeamName === 'McLaren') {
            teamLogo = TEAM_IMAGES + 'McLaren.png';
        } else if (driver.TeamName === 'Racing Bulls') {
            teamLogo = TEAM_IMAGES + 'RacingBulls.png';
        } else if (driver.TeamName === 'Alpine') {
            teamLogo = TEAM_IMAGES + 'Alpine.png';
        } else if (driver.TeamName === 'Williams') {
            teamLogo = TEAM_IMAGES + 'Williams.png';
        } else if (driver.TeamName === 'Haas F1 Team') {
            teamLogo = TEAM_IMAGES + 'Haas.png';
        } else if (driver.TeamName === 'Aston Martin') {
            teamLogo = TEAM_IMAGES + 'AstonMartin.png';
        } else if (driver.TeamName === 'Audi') {
            teamLogo = TEAM_IMAGES + 'Audi.png';
        } else if (driver.TeamName === 'Cadillac') {
            teamLogo = TEAM_IMAGES + 'Cadillac.png';
        }

        // console.log(compound);
        if (compound === 'SOFT') {
            tyreImg = TYRES_IMG + 'soft.png';
        } else if (compound === 'MEDIUM') {
            tyreImg = TYRES_IMG + 'medium.png';
        } else if (compound === 'HARD') {
            tyreImg = TYRES_IMG + 'hard.png';
        } else if (compound === 'INTERMEDIATE') {
            tyreImg = TYRES_IMG + 'inters.png';
        } else if (compound === 'WET') {
            tyreImg = TYRES_IMG + 'full_wet.png';
        } else if (compound === 'N/A') {
            tyreImg = '';
            compound = ' - ';
        }
        // const selectorOptGap = document.querySelector('.selOptGap');
        if (typeSession === 'Race' || typeSession === 'Sprint') {
            rowsHtml += `
                <tr>
                    <td><strong>${driver.Position || '-'}${difHtml}</strong></td>
                    <td>
                    <span class="team-stripe" style="background-color: ${teamColor};"></span>
                    <strong>${driver.Tla || driver.BroadcastName || ('#' + racingNumber)}</strong>
                    </td>
                    <td><img class='f1teamlogo' src='${teamLogo}'> ${driver.TeamName || '-'}</td>
                    <td>${gap}</td>
                    <td>${lastLap}</td>
                    <td>${bestLap}</td>
                    <td>
                    <span><img class='tyreImg' src='${tyreImg}'></span>
                    <span class="tyre-badge tyre-${compound}">${compound}</span>
                    <small style="color:#aaa;">${tyreLaps}</small>
                    </td>
                    <td>${driver.InPit ? '🛑 EN BOX' : (driver.NumberOfPitStops || 0)}</td>
                </tr>
            `;
        } else if (typeSession === 'Qualifying' || typeSession === 'Practice') {
            rowsHtml += `
                <tr>
                    <td><strong>${driver.Position || '-'}</strong></td>
                    <td>
                    <span class="team-stripe" style="background-color: ${teamColor};"></span>
                    <strong>${driver.Tla || driver.BroadcastName || ('#' + racingNumber)}</strong>
                    </td>
                    <td><img class='f1teamlogo' src='${teamLogo}'> ${driver.TeamName || '-'}</td>
                    <td>${gap}</td>
                    <td class="sector1TimeTable" style="${sector1OF ? 'color: #9b59b6;' : (sector1PF ? 'color: #2ecc71;' : '')}">${sector1Time}</td>
                    <td class="sector2TimeTable" style="${sector2OF ? 'color: #9b59b6;' : (sector2PF ? 'color: #2ecc71;' : '')}">${sector2Time}</td>
                    <td class="sector3TimeTable" style="${sector3OF ? 'color: #9b59b6;' : (sector3PF ? 'color: #2ecc71;' : '')}">${sector3Time}</td>
                    <td>${bestLap}</td>
                    <td>
                    ${compound === ' - ' ? `` : `<span><img class="tyreImg" src="${tyreImg}"></span>`}
                    <span class="tyre-badge tyre-${compound}">${compound}</span>
                    <small style="color:#aaa;">${tyreLaps}</small>
                    </td>
                    <td>${driver.InPit ? '🛑 EN BOX' : ' - '}</td>
                </tr>
            `;
        }
    });

    tbody.innerHTML = rowsHtml;
}

// Consulta el estado de conexión con el SignalR de la F1
async function checkStatus() {
    // console.log('fucntion checkStatus f1data.js');
    // return false;
    const statusBadge = document.getElementById('connection-status');
    try {
        const res = await fetch(`${API_URL}/status`);
        const status = await res.json();
        if (status.isConnected) {
            statusBadge.textContent = 'EN VIVO';
            statusBadge.classList.add('online');
        } else {
            statusBadge.textContent = 'DESCONECTADO';
            statusBadge.classList.remove('online');
        }
    } catch {
        statusBadge.textContent = 'API CAÍDA';
        statusBadge.classList.remove('online');
    }
}

// Calcular diferencia de posiciones respecto a la salida
function claculateDifPos(position, gridPosition) {
    const diferencia = Math.abs(gridPosition - position);

    let tipoDiferencia = "";

    if (gridPosition > position) {
        tipoDiferencia = "positive";
    } else if (gridPosition < position) {
        tipoDiferencia = "negative";
    } else {
        tipoDiferencia = "equal";
    }

    // Retornamos un objeto con los resultados
    return {
        diferencia: diferencia,
        tipo: tipoDiferencia
    };
}

// Incluir la imagen del header
function includeImgHeader() {
    const imgHeaderHTML = document.getElementById('imgHeader');
    const imgHeader = HEADER_IMG + 'f1-tracker_header.png';
    imgHeaderHTML.innerHTML = `<img class='imageHeader' src='${imgHeader}'>`;
}

// Consultar los mensajes de dirección de carrera
async function fetchRaceControl() {
    try {
        const response = await fetch(`${API_URL}/race-control`);
        if (!response.ok) return;

        const data = await response.json();
        const messages = data.RaceControl || [];

        // Poner en cola los datos de control de carrera según el retraso
        if (broadcastDelayMs > 0) {
            raceControlQueue.push({ data: messages, readyAt: Date.now() + broadcastDelayMs });
        } else {
            updateTrackStatus(messages);
        }
    } catch (error) {
        console.error('Error al obtener mensajes de Race Control:', error);
    }
}

// Coger el logotipo de las scuderias
function getTeamLogo(teamName) {
    if (!teamName) return '';
    if (teamName === 'Red Bull Racing') return TEAM_IMAGES + 'RedBull.png';
    if (teamName === 'Ferrari') return TEAM_IMAGES + 'Ferrari.png';
    if (teamName === 'Mercedes') return TEAM_IMAGES + 'Mercedes.png';
    if (teamName === 'McLaren') return TEAM_IMAGES + 'McLaren.png';
    if (teamName === 'Racing Bulls') return TEAM_IMAGES + 'RacingBulls.png';
    if (teamName === 'Alpine') return TEAM_IMAGES + 'Alpine.png';
    if (teamName === 'Williams') return TEAM_IMAGES + 'Williams.png';
    if (teamName === 'Haas F1 Team') return TEAM_IMAGES + 'Haas.png';
    if (teamName === 'Aston Martin') return TEAM_IMAGES + 'AstonMartin.png';
    if (teamName === 'Audi') return TEAM_IMAGES + 'Audi.png';
    if (teamName === 'Cadillac') return TEAM_IMAGES + 'Cadillac.png';
    return '';
}

// Gestionar el formato de fecha de la radio
function formatRadioTime(utcString) {
    if (!utcString) return '--:--:--';
    const date = new Date(utcString);
    return isNaN(date.getTime()) ? utcString : date.toLocaleTimeString();
}

// Formatear segundos a formato M:SS (ejemplo: 0:04)
function formatAudioTime(seconds) {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Coger las radios de la API
async function fetchTeamRadio() {
    try {
        const response = await fetch(`${API_URL}/radio`);
        if (!response.ok) return;

        const data = await response.json();
        if (data.SessionPath) {
            currentSessionPath = data.SessionPath;
        }
        const captures = data.Captures || [];

        renderTeamRadios(captures);
    } catch (error) {
        console.error('Error al obtener radios de la API:', error);
    }
}

// Introducir la lista de radios en el DOM
function renderTeamRadios(captures) {
    const container = document.getElementById('radios-container');
    if (!container) return;

    if (!captures || captures.length === 0) {
        container.innerHTML = '<div class="no-radios">No hay transmisiones de radio disponibles en este momento.</div>';
        lastRadiosData = '[]';
        return;
    }

    // Mostrar las radios más recientes primero
    const reversedCaptures = [...captures].reverse();

    // Comprobar si los datos han cambiado
    const serialized = JSON.stringify(reversedCaptures);
    if (serialized === lastRadiosData) {
        return;
    }
    lastRadiosData = serialized;

    let html = '';
    const today = new Date();
    reversedCaptures.forEach(capture => {
        // No introducir en el DOM las radios que son de otro dia
        if (capture.Utc) {
            const radioDate = new Date(capture.Utc);
            const isSameDay =
                radioDate.getUTCFullYear() === today.getUTCFullYear() &&
                radioDate.getUTCMonth() === today.getUTCMonth() &&
                radioDate.getUTCDate() === today.getUTCDate();
            if (!isSameDay) return;
        }

        const path = capture.Path || '';
        const isPlaying = (activeRadioPath === path && activeAudio && !activeAudio.paused);
        const hasAudioClass = (activeRadioPath === path && activeAudio) ? 'has-audio' : '';
        const cardPlayingClass = isPlaying ? 'is-playing' : '';
        const btnPlayingClass = isPlaying ? 'playing' : '';
        const btnLabel = isPlaying ? '⏸ Pausar' : '▶ Reproducir';

        const teamColor = capture.TeamColour ? `#${capture.TeamColour}` : '#e10600';
        const teamLogo = getTeamLogo(capture.TeamName);
        const timeFormatted = formatRadioTime(capture.Utc);
        const driverName = capture.BroadcastName || capture.Tla || `Piloto #${capture.RacingNumber || '?'}`;
        const racingNum = capture.RacingNumber ? `#${capture.RacingNumber}` : '';

        const initialPct = (isPlaying && activeAudio && activeAudio.duration)
            ? Math.min(100, (activeAudio.currentTime / activeAudio.duration) * 100)
            : 0;
        const initialCurrent = (isPlaying && activeAudio) ? formatAudioTime(activeAudio.currentTime) : '0:00';
        const initialDuration = (isPlaying && activeAudio && activeAudio.duration) ? formatAudioTime(activeAudio.duration) : '--:--';

        html += `
            <div class="radio-card ${cardPlayingClass} ${hasAudioClass}" data-path="${path}">
                <div class="radio-card-header">
                    <div class="radio-driver-block">
                        <span class="team-stripe radio-team-stripe" style="background-color: ${teamColor};"></span>
                        <div>
                            <span class="radio-driver-name">${driverName}</span>
                            <span class="radio-driver-number">${racingNum}</span>
                        </div>
                    </div>
                    <span class="radio-time-badge">${timeFormatted}</span>
                </div>
                <div class="radio-card-body">
                    <div class="radio-team-block">
                        ${teamLogo ? `<img class="radio-team-logo" src="${teamLogo}" alt="">` : ''}
                        <span>${capture.TeamName || 'Equipo F1'}</span>
                    </div>
                    <button class="radio-play-btn ${btnPlayingClass}" data-path="${path}" onclick="toggleRadioPlayback('${path}')">
                        ${btnLabel}
                    </button>
                </div>
                <div class="radio-progress-container">
                    <div class="radio-progress-bar">
                        <div class="radio-progress-fill" style="width: ${initialPct}%;"></div>
                    </div>
                    <div class="radio-time-display">
                        <span class="radio-current-time">${initialCurrent}</span>
                        <span class="radio-duration-time">${initialDuration}</span>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Gestionar la reproducción de radios
async function toggleRadioPlayback(path) {
    if (!path) return;

    // Si ya estamos reproduciendo esta misma radio, alternamos reproducir / pausar
    if (activeRadioPath === path && activeAudio) {
        if (activeAudio.paused) {
            activeAudio.play().then(() => {
                updateRadioUI(path, true);
            }).catch(err => {
                console.warn('[Radio] Error al reanudar audio:', err);
            });
        } else {
            activeAudio.pause();
            updateRadioUI(path, false);
        }
        return;
    }

    // Si hay otro audio sonando, pausamos y restablecemos su botón y barra
    if (activeAudio) {
        activeAudio.pause();
        if (activeRadioPath) {
            resetRadioProgress(activeRadioPath);
            updateRadioUI(activeRadioPath, false);
        }
    }

    // Si todavía no disponemos de currentSessionPath, consultamos la sesión
    if (!currentSessionPath) {
        try {
            const sessionRes = await fetch(`${API_URL}/session`);
            if (sessionRes.ok) {
                const sessionData = await sessionRes.json();
                if (sessionData.Session && sessionData.Session.Path) {
                    currentSessionPath = sessionData.Session.Path;
                }
            }
        } catch (e) {
            console.warn('[Radio] Error al consultar session path:', e);
        }
    }

    activeRadioPath = path;
    const sessionDir = currentSessionPath ? (currentSessionPath.endsWith('/') ? currentSessionPath : `${currentSessionPath}/`) : '';
    const fullAudioUrl = path.startsWith('http') ? path : `${F1_STATIC_BASE_URL}${sessionDir}${path}`;
    // console.log('Radio URL:', fullAudioUrl);
    activeAudio = new Audio(fullAudioUrl);

    activeAudio.onloadedmetadata = () => {
        updateRadioProgress(path, activeAudio.currentTime, activeAudio.duration);
    };

    activeAudio.ontimeupdate = () => {
        updateRadioProgress(path, activeAudio.currentTime, activeAudio.duration);
    };

    activeAudio.onplay = () => updateRadioUI(path, true);
    activeAudio.onpause = () => updateRadioUI(path, false);
    activeAudio.onended = () => {
        resetRadioProgress(path);
        updateRadioUI(path, false);
        activeAudio = null;
        activeRadioPath = null;
    };
    activeAudio.onerror = (e) => {
        console.warn('[Radio] Error al cargar o reproducir audio:', e);
        resetRadioProgress(path);
        updateRadioUI(path, false);
        activeAudio = null;
        activeRadioPath = null;
    };

    activeAudio.play().catch(err => {
        console.warn('[Radio] Autoplay bloqueado o fallo en reproducción:', err);
        resetRadioProgress(path);
        updateRadioUI(path, false);
        activeAudio = null;
        activeRadioPath = null;
    });
}

// Actualizar la barra progresiva y los contadores de tiempo
function updateRadioProgress(path, current, duration) {
    const card = document.querySelector(`.radio-card[data-path="${path}"]`);
    if (!card) return;

    const fill = card.querySelector('.radio-progress-fill');
    const currentEl = card.querySelector('.radio-current-time');
    const durationEl = card.querySelector('.radio-duration-time');

    const validCurrent = isNaN(current) ? 0 : current;
    const validDuration = (isNaN(duration) || !isFinite(duration)) ? 0 : duration;
    const pct = validDuration > 0 ? Math.min(100, (validCurrent / validDuration) * 100) : 0;

    if (fill) {
        fill.style.width = `${pct}%`;
    }
    if (currentEl) {
        currentEl.textContent = formatAudioTime(validCurrent);
    }
    if (durationEl && validDuration > 0) {
        durationEl.textContent = formatAudioTime(validDuration);
    }
}

// Restablecer la barra de progreso
function resetRadioProgress(path) {
    const card = document.querySelector(`.radio-card[data-path="${path}"]`);
    if (!card) return;

    const fill = card.querySelector('.radio-progress-fill');
    const currentEl = card.querySelector('.radio-current-time');
    const durationEl = card.querySelector('.radio-duration-time');
    // console.log('FILL', fill);
    // console.log('currentEl', currentEl);
    // console.log('durationEl', durationEl);

    if (fill) fill.style.width = '0%';
    if (currentEl) currentEl.textContent = '0:00';
    if (durationEl) durationEl.textContent = '--:--';
}

// Estado visual de la radio
function updateRadioUI(path, isPlaying) {
    const card = document.querySelector(`.radio-card[data-path="${path}"]`);
    const btn = document.querySelector(`.radio-play-btn[data-path="${path}"]`);

    if (card) {
        if (isPlaying) {
            card.classList.add('is-playing');
            card.classList.add('has-audio');
        } else {
            card.classList.remove('is-playing');
            card.classList.remove('has-audio');
        }
    }

    if (btn) {
        if (isPlaying) {
            btn.classList.add('playing');
            btn.innerHTML = '⏸ Pausar';
        } else {
            btn.classList.remove('playing');
            btn.innerHTML = '▶ Reproducir';
        }
    }
}

// Estado actual de la pista
function updateTrackStatus(messages) {
    const banner = document.getElementById('track-status-banner');
    const FIA_logo = OTHERS_IMG + 'fia_logo.png';
    const carImg = OTHERS_IMG + 'car.png';
    if (!banner) return;

    if (!messages || messages.length === 0) {
        banner.style.display = 'none';
        return;
    }

    // Buscar el último mensaje relevante
    let currentStatus = null;

    for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        let text = (msg.Message || '').toUpperCase();
        let flag = (msg.Flag || '').toUpperCase();
        let mode = (msg.Mode || '').toUpperCase();
        let category = (msg.Category || '').toUpperCase();
        let status = (msg.Status || '').toUpperCase();

        // console.log('msg\n', msg);
        // console.log('text\n', text);
        // console.log('flag\n', flag);
        // console.log('mode\n', mode);
        // console.log('status\n', status);

        // Modificación de datos de la API para hacer pruebas
        // mode = 'SAFETY CAR';
        // mode = 'VIRTUAL';
        // mode = 'RED';
        // flag = 'RED';
        // flag = 'YELLOW';
        // msg.Sector = '2';
        // flag = 'DOUBLE YELLOW';
        // flag = 'GREEN';
        // flag = 'CLEAR';
        // flag = 'CHEQUERED';
        // text = 'IN THIS LAP';
        // text = 'ENDING';
        // category = 'Other';
        // text = 'CAR 12 (ANT) TIME 2:03.833 DELETED - TRACK LIMITS AT TURN 7 LAP 40 21:09:33';

        // Safety Car 
        if (mode.includes('SAFETY CAR') && !mode.includes('VIRTUAL') || text.includes('SAFETY CAR DEPLOYED')) {
            if (status === 'IN THIS LAP' || text.includes('IN THIS LAP')) {
                currentStatus = { type: 'sc-ending', label: `<img class="car_img" src="${carImg}">SAFETY CAR ENTRANDO EN BOX`, class: 'status-sc' };
            } else {
                currentStatus = { type: 'sc', label: `<img class="car_img" src="${carImg}">SAFETY CAR (SC)`, class: 'status-sc' };
            }
            break;
        }

        // Virtual Safety Car
        if (mode.includes('VIRTUAL') || text.includes('VIRTUAL SAFETY CAR')) {
            if (status === 'ENDING' || text.includes('ENDING')) {
                currentStatus = { type: 'vsc-ending', label: `<img class="car_img" src="${carImg}">VSC TERMINANDO`, class: 'status-vsc' };
            } else {
                currentStatus = { type: 'vsc', label: `<img class="car_img" src="${carImg}">VIRTUAL SAFETY CAR (VSC)`, class: 'status-vsc' };
            }
            break;
        }

        // Categoria de 'Other' (Normalmente avisos de sanciones, track limits, etc.)
        if (category === 'Other') {
            currentStatus = { type: 'other', label: `<img class="fia_msg_img" src="${FIA_logo}">${text}`, class: 'status-other' };
            break;
        }

        // Bandera a cuadros
        if (flag === 'CHEQUERED' || text.includes('CHEQUERED')) {
            currentStatus = { type: 'chequered', label: `BANDERA A CUADROS`, class: 'status-chequered' };
            break;
        }

        // Bandera Roja
        if (flag === 'RED' || text.includes('RED FLAG')) {
            currentStatus = { type: 'red', label: 'BANDERA ROJA - SESIÓN DETENIDA', class: 'status-red' };
            break;
        }

        // Bandera Amarilla
        if (flag === 'YELLOW' || flag === 'DOUBLE YELLOW' || text.includes('YELLOW')) {
            const sectorText = msg.Sector ? ` EN SECTOR ${msg.Sector}` : '';
            currentStatus = { type: 'yellow', label: `BANDERA AMARILLA${sectorText}`, class: 'status-yellow' };
            break;
        }

        // Bandera Verde / Fin de peligro
        if (flag === 'GREEN' || flag === 'CLEAR' || text.includes('CLEAR') || text.includes('GREEN FLAG')) {
            currentStatus = { type: 'green', label: 'PISTA LIBRE / BANDERA VERDE', class: 'status-green' };
            break;
        }
    }

    // Renderizar en el DOM
    if (currentStatus) {
        banner.innerHTML = currentStatus.label;
        banner.className = `track-status-banner ${currentStatus.class}`;
        banner.style.display = 'inline-block';
    } else {
        banner.style.display = 'none';
    }
}

// Slide para ver/ocultar las radios
function showRadios() {
    const textViewRadios = document.getElementById('text-view-radios');
    let countClicksViewRadios = 0;

    $(document).on('click', '.text-view-radios', function () {
        $('.slide-radios').slideToggle();
        countClicksViewRadios++;
        // console.log(countClicksViewRadios);
        if (countClicksViewRadios % 2 === 0) {
            textViewRadios.innerHTML = `<a>MOSTRAR RADIOS</a>`;
        } else {
            textViewRadios.innerHTML = `<a>OCULTAR RADIOS</a>`;
        }
    });
}

// Coger los datos del tiempo
async function fetchWeather() {
    try {
        const response = await fetch(`${API_URL}/weather`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        renderWeather(data);
    } catch (error) {
        console.error('Error al obtener datos de la API:', error);
    }
}

function renderWeather(data) {
    // console.log(data);
    const weather = data.Weather;
    let whtml = document.getElementById('weatherHtml');
    let divsWeather = '';
    let airTempHtml = '';
    let humidityHtml = '';
    let trackTempHtml = '';
    let windDirectionHtml = '';
    let windSpeedHtml = '';
    // console.log(weather);
    // return false;

    const airTemp = weather.AirTemp || '-';
    const humidity = weather.Humidity || '-';
    const pressure = weather.Pressure || '-';
    const rainfall = weather.Rainfall || '-';
    const trackTemp = weather.TrackTemp || '-';
    const windDirection = weather.WindDirection || '-';
    const windSpeed = weather.WindSpeed || '-';

    // console.log('AirTemp:', airTemp);
    // console.log('Humidity:', humidity);
    // console.log('Pressure:', pressure);
    // console.log('Rainfall:', rainfall);
    // console.log('TrackTemp', trackTemp);
    // console.log('WindDirection', windDirection);
    // console.log('WindSpeed', windSpeed);
    // return false;

    airTempHtml = `
        <div class="wbox airTemp">
            <a>Temperatura: ${airTemp}º</a>
        </div>
    `;
    humidityHtml = `
        <div class="wbox humidity">
            <a>Humedad: ${humidity}</a>
        </div>
    `;
    trackTempHtml = `
        <div class="wbox trackTemp">
            <a>Temperatura en pista: ${trackTemp}º</a>
        </div>
    `;
    windDirectionHtml = `
        <div class="wbox winDirection">
            <a>Dirección del viento: ${windDirection}</a>
        </div>
    `;
    windSpeedHtml = `
        <div class="wbox windSpeed">
            <a>Velocidad del viento: ${windSpeed}km/h</a>
        </div>
    `;

    divsWeather = airTempHtml + humidityHtml + trackTempHtml + windDirectionHtml + windSpeedHtml;
    whtml.innerHTML = divsWeather;
}


// 1. Ejecutar al cargar la página
includeImgHeader();
checkStatus();
fetchF1Data();
fetchRaceControl();
fetchTeamRadio();
// fetchWeather();
showRadios();

// 2. Mantener actualizado periódicamente (Polling)
setInterval(fetchF1Data, 1000);
setInterval(checkStatus, 5000);
setInterval(fetchRaceControl, 2000);
setInterval(fetchTeamRadio, 3000);
// setInterval(fetchWeather, 5000);

// 3. Vaciar la cola cada 250ms
setInterval(drainDelayQueues, 250);