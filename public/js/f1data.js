// console.log('f1data.js cargado');
// URL base de la API
// const API_URL = 'http://localhost:3000/api';
const API_URL = `http://${window.location.hostname}:3000/api`;

// Obtener los datos y imprimirlos en pantalla
async function fetchF1Data() {
    // console.log('function fetchF1Data f1data.js');
    // return false;
    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        renderLeaderboard(data);
    } catch (error) {
        console.error('Error al obtener datos de la API:', error);
    }
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
    let typeSession = data.Session.Type;
    // typeSession = 'Qualifying';
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
        const currentStint = driver.Stints && driver.Stints.length > 0
            ? driver.Stints[driver.Stints.length - 1]
            : null;

        const compound = currentStint?.Compound || 'N/A';
        const tyreLaps = currentStint ? `(${currentStint.TotalLaps || 0} v)` : '';
        if (valueGap === 'leader') {
            var gap = driver.GapToLeader?.Value || driver.GapToLeader || '-';
        } else if (valueGap === 'interval') {
            var gap = driver.IntervalToPositionAhead?.Value || driver.IntervalToPositionAhead || '-';
        }
        const lastLap = driver.LastLapTime?.Value || '-';
        const bestLap = driver.BestLapTime?.Value || '-';
        const teamColor = driver.TeamColour ? `#${driver.TeamColour}` : '#888';
        const position = driver.Position || '-';
        const gridPosition = driver.GridPos || '-';
        const driverRetired = driver.Retired;
        // Sectores para calsificación
        const sectors = driver.Sectors || '-';
        // Sector 1
        const sector1 = sectors[0];
        var sector1Time = sector1.Value;
        var sector1OF = sector1.OverallFastest;
        var sector1PF = sector1.PersonalFastest;
        // Sector 2
        const sector2 = sectors[1];
        var sector2Time = sector2.Value;
        var sector2OF = sector2.OverallFastest;
        var sector2PF = sector2.PersonalFastest;
        // Sector 3
        const sector3 = sectors[2];
        var sector3Time = sector3.Value;
        var sector3OF = sector3.OverallFastest;
        var sector3PF = sector3.PersonalFastest;
        // console.log(sectors);
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
        if (sector1Time === '') {
            sector1Time = ' - ';
        }
        if (sector2Time === '') {
            sector2Time = ' - ';
        }
        if (sector3Time === '') {
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

        if (position === "1") { gap = 'Líder' };
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
        }

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
                    <span><img class='tyreImg' src='${tyreImg}'></span>
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

        // Procesar los mensajes para obtener el estado actual
        updateTrackStatus(messages);
    } catch (error) {
        console.error('Error al obtener mensajes de Race Control:', error);
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


// 1. Ejecutar al cargar la página
includeImgHeader();
checkStatus();
fetchF1Data();
fetchRaceControl();

// 2. Mantener actualizado periódicamente (Polling)
setInterval(fetchF1Data, 1000);
setInterval(checkStatus, 5000);
setInterval(fetchRaceControl, 2000);