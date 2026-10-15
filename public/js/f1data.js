// console.log('f1data.js cargado');
// URL base de la API
const API_URL = 'http://localhost:3000/api';

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
    console.log(data);
    // return false;
    const tbody = document.getElementById('leaderboard-body');
    const divLaps = document.getElementById('numLapsDiv');

    // Validar si existen pilotos en la sesión
    if (!data || !data.Leaderboard || data.Leaderboard.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#888;">No hay coches en pista o la sesión no ha iniciado.</td></tr>`;
        return;
    }

    let rowsHtml = '';
    // Actualizar las vueltas
    document.getElementById('currentLap').textContent = data.LapCount.CurrentLap;
    document.getElementById('totalLaps').textContent = data.LapCount.TotalLaps;


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
        // console.log(position);

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

        rowsHtml += `
      <tr>
        <td><strong>${driver.Position || '-'}</strong></td>
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

function includeImgHeader() {
    const imgHeaderHTML = document.getElementById('imgHeader');
    const imgHeader = HEADER_IMG + 'f1-tracker_header.png';
    imgHeaderHTML.innerHTML = `<img class='imageHeader' src='${imgHeader}'>`;
}

// 1. Ejecutar al cargar la página
includeImgHeader();
checkStatus();
fetchF1Data();

// 2. Mantener actualizado periódicamente (Polling)
setInterval(fetchF1Data, 1000);
setInterval(checkStatus, 5000);