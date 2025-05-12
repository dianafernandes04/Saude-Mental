const emocaoLabels = [
    'alegria',
    'neutra',
    'ansiedade',
    'tristeza',
    'raiva',
    'medo'
];
const corPorEmocao = {
    alegria: '#FFD600',    // amarelo
    neutra: '#90A4AE',     // cinzento
    ansiedade: '#FF9800',  // laranja
    tristeza: '#2196F3',   // azul
    raiva: '#E53935',      // vermelho
    medo: '#8E24AA'        // roxo
};

// Função para desenhar o gráfico
function renderEmocaoChart(sessoes) {
    const ctx = document.getElementById('emocaoChart').getContext('2d');
    const data = [];
    const pointColors = [];

    // Espera-se que sessoes seja um array de objetos {timestamp, emocao}
    sessoes.forEach(sessao => {
        if (emocaoLabels.includes(sessao.emocao)) {
            data.push({ x: sessao.timestamp, y: sessao.emocao });
            pointColors.push(corPorEmocao[sessao.emocao]);
        }
    });

    if (window.emocaoChartInstance) window.emocaoChartInstance.destroy();

    window.emocaoChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Tendência Emocional',
                data: data,
                fill: false,
                borderColor: '#475866',
                backgroundColor: '#475866',
                tension: 0.2,
                pointBackgroundColor: pointColors,
                pointRadius: 7,
                parsing: {
                    xAxisKey: 'x',
                    yAxisKey: 'y'
                }
            }]
        },
        options: {
            parsing: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'dd/MM/yyyy HH:mm',
                        displayFormats: {
                            day: 'dd/MM/yyyy'
                        }
                    },
                    title: { display: false },
                    ticks: {
                        color: '#475866'
                    }
                },
                y: {
                    type: 'category',
                    labels: emocaoLabels,
                    reverse: false,
                    grid: { display: true },
                    ticks: {
                        font: { size: 14 },
                        color: '#475866'
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    renderEmocaoLegend(corPorEmocao, emocaoLabels);
}

// Função para desenhar a legenda
function renderEmocaoLegend(corPorEmocao, emocaoLabels) {
    let legendDiv = document.getElementById('emocao-legend');
    if (!legendDiv) {
        legendDiv = document.createElement('div');
        legendDiv.id = 'emocao-legend';
        legendDiv.style.display = 'flex';
        legendDiv.style.justifyContent = 'center';
        legendDiv.style.gap = '16px';
        legendDiv.style.marginTop = '12px';
        legendDiv.style.flexWrap = 'wrap';
        document.getElementById('grafico-emocional-container').appendChild(legendDiv);
    }
    legendDiv.innerHTML = emocaoLabels.map(emocao => `
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:1em;">
            <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${corPorEmocao[emocao]};border:1.5px solid #ccc;"></span>
            ${emocao.charAt(0).toUpperCase() + emocao.slice(1)}
        </span>
    `).join('');
}
