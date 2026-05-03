// ============================================================
// SCRIPT DE TESTE — rode cada função pelo menu do Apps Script:
//   Executar → testarConversorDeHorario
//   Executar → testarLogicaPrincipal
//   Executar → testarBuscaNaPlanilhaExterna
//   Executar → rodarTodosTestes
// Veja os resultados em: Executar → Registros de execução
// ============================================================

function rodarTodosTestes() {
  Logger.log('==============================');
  Logger.log('INICIANDO TODOS OS TESTES');
  Logger.log('==============================');
  testarConversorDeHorario();
  testarLogicaPrincipal();
  testarBuscaNaPlanilhaExterna();
  Logger.log('==============================');
  Logger.log('TESTES CONCLUÍDOS');
  Logger.log('==============================');
}

// ------------------------------------------------------------
// TESTE 1 — converterParaMinutos
// ------------------------------------------------------------
function testarConversorDeHorario() {
  Logger.log('\n--- TESTE 1: converterParaMinutos ---');

  const casos = [
    { entrada: '08:00', esperado: 480,  descricao: 'string "08:00"' },
    { entrada: '12:30', esperado: 750,  descricao: 'string "12:30"' },
    { entrada: '23:59', esperado: 1439, descricao: 'string "23:59"' },
    { entrada: 0.5,     esperado: 720,  descricao: 'número 0.5 (12:00 em fração do Sheets)' },
    { entrada: 0.75,    esperado: 1080, descricao: 'número 0.75 (18:00 em fração do Sheets)' },
    { entrada: new Date(2024, 0, 1, 9, 45), esperado: 585, descricao: 'objeto Date 09:45' },
  ];

  let passou = 0;
  casos.forEach(({ entrada, esperado, descricao }) => {
    const resultado = converterParaMinutos(entrada);
    const ok = resultado === esperado;
    Logger.log(`  [${ok ? 'OK' : 'FALHOU'}] ${descricao} → ${resultado} min (esperado: ${esperado} min)`);
    if (ok) passou++;
  });

  Logger.log(`  Resultado: ${passou}/${casos.length} testes passaram`);
}

// ------------------------------------------------------------
// TESTE 2 — lógica principal com dados simulados
// ------------------------------------------------------------
function testarLogicaPrincipal() {
  Logger.log('\n--- TESTE 2: lógica principal com dados simulados ---');

  // Simula ADC BASE (linha 0 = cabeçalho)
  // [coluna A = motorista, coluna B = horário final, coluna C = flag]
  const baseData = [
    ['Motorista', 'Horário Final', 'Flag'],         // cabeçalho
    ['João Silva',  '18:30', '0'],  // C=0 → deve processar
    ['Maria Souza', '17:00', '1'],  // C=1 → deve ignorar
    ['Carlos Lima',  '20:00', '0'], // C=0 → deve processar
    ['Ana Costa',   '16:00', '0'],  // C=0 → deve processar
    ['',            '10:00', '0'],  // motorista vazio → deve ignorar
  ];

  // Simula ROTA HOJE — coluna D (índice 3) = motorista, coluna L (índice 11) = horário
  // Criamos 12 colunas por linha (A até L)
  const vazio = ['', '', '', '', '', '', '', '', '', '', '', ''];

  function linha(motorista, horario) {
    const r = vazio.slice();
    r[3]  = motorista; // coluna D
    r[11] = horario;   // coluna L
    return r;
  }

  const rotaData = [
    linha('João Silva',  '17:00'), // ocorrência 1 — será ignorada (mais antiga)
    linha('Carlos Lima',  '21:00'), // ocorrência 1 — será ignorada
    linha('Ana Costa',   '16:30'), // ocorrência 1 — será ignorada
    linha('João Silva',  '19:00'), // ocorrência 2 — última, será usada (19:00 > 18:30 → NÃO registra)
    linha('Carlos Lima',  '18:00'), // ocorrência 2 — última (18:00 < 20:00 → registra)
    linha('Ana Costa',   '15:45'), // ocorrência 2 — última (15:45 < 16:00 → registra)
  ];

  // Casos esperados:
  // João Silva:  horário final 18:30, encontrado 19:00 → 18:30 < 19:00 → NÃO registra
  // Carlos Lima: horário final 20:00, encontrado 18:00 → 20:00 > 18:00 → REGISTRA
  // Ana Costa:  horário final 16:00, encontrado 15:45 → 16:00 > 15:45 → REGISTRA

  const esperados = {
    'João Silva':  false,
    'Carlos Lima': true,
    'Ana Costa':   true,
  };

  const resultados = simularLogica(baseData, rotaData);

  Logger.log('  Resultados encontrados:');
  let passou = 0;
  let total  = Object.keys(esperados).length;

  Object.entries(esperados).forEach(([nome, deveRegistrar]) => {
    const registrado = resultados.some(r => r[0] === nome);
    const ok = registrado === deveRegistrar;
    Logger.log(`    [${ok ? 'OK' : 'FALHOU'}] ${nome}: ${deveRegistrar ? 'deve registrar' : 'não deve registrar'} → ${registrado ? 'registrado' : 'não registrado'}`);
    if (ok) passou++;
  });

  Logger.log('  Detalhes do relatório gerado:');
  if (resultados.length === 0) {
    Logger.log('    (nenhum registro)');
  } else {
    resultados.forEach(r => Logger.log(`    Motorista: ${r[0]} | Horário Final: ${r[1]} | Encontrado: ${r[2]}`));
  }

  Logger.log(`  Resultado: ${passou}/${total} testes passaram`);
}

// Replica a lógica de verificarMotoristas usando dados simulados
function simularLogica(baseData, rotaData) {
  const COLUNA_HORARIO = 11; // coluna L
  const resultados = [];

  for (let i = 1; i < baseData.length; i++) {
    const cValor       = baseData[i][2];
    const motorista    = baseData[i][0];
    const horarioFinal = baseData[i][1];

    if (String(cValor).trim() !== '0') continue;
    if (!motorista || String(motorista).trim() === '') continue;

    const nomeMotorista = String(motorista).trim();

    let horarioEncontrado = null;
    for (let j = rotaData.length - 1; j >= 0; j--) {
      if (String(rotaData[j][3]).trim().toLowerCase() === nomeMotorista.toLowerCase()) {
        horarioEncontrado = rotaData[j][COLUNA_HORARIO];
        break;
      }
    }

    if (horarioEncontrado === null || horarioEncontrado === '') continue;

    const minFinal      = converterParaMinutos(horarioFinal);
    const minEncontrado = converterParaMinutos(horarioEncontrado);

    if (minFinal > minEncontrado) {
      resultados.push([nomeMotorista, horarioFinal, horarioEncontrado]);
    }
  }

  return resultados;
}

// ------------------------------------------------------------
// TESTE 3 — conexão com planilha externa (leitura real)
// ------------------------------------------------------------
function testarBuscaNaPlanilhaExterna() {
  Logger.log('\n--- TESTE 3: conexão com planilha externa ---');

  const EXTERNAL_SHEET_ID = '1ExFP9LbhEQKLTShn3iM_5UsYBdETivTk81qH8EcwNFI';

  let externalSs;
  try {
    externalSs = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
    Logger.log('  [OK] Planilha externa aberta com sucesso');
  } catch (e) {
    Logger.log('  [FALHOU] Não foi possível abrir a planilha externa: ' + e.message);
    Logger.log('  Verifique: a conta tem permissão de leitura na planilha externa?');
    return;
  }

  const rotaHoje = externalSs.getSheetByName('ROTA HOJE');
  if (!rotaHoje) {
    Logger.log('  [FALHOU] Aba "ROTA HOJE" não encontrada na planilha externa');
    return;
  }
  Logger.log('  [OK] Aba "ROTA HOJE" encontrada');

  const dados = rotaHoje.getDataRange().getValues();
  Logger.log(`  [OK] Total de linhas lidas: ${dados.length}`);

  // Mostra amostra das primeiras 5 linhas das colunas D e L
  Logger.log('  Amostra (coluna D = motorista | coluna L = horário):');
  const amostra = Math.min(6, dados.length);
  for (let i = 0; i < amostra; i++) {
    const d = dados[i][3]  !== undefined ? dados[i][3]  : '(vazio)';
    const l = dados[i][11] !== undefined ? dados[i][11] : '(vazio)';
    Logger.log(`    Linha ${i + 1} → D: "${d}" | L: "${l}"`);
  }

  // Verifica se ADC BASE existe na planilha ativa
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const adcBase = ss.getSheetByName('ADC BASE');
  if (!adcBase) {
    Logger.log('  [AVISO] Aba "ADC BASE" não encontrada na planilha ativa — verifique o nome');
  } else {
    Logger.log('  [OK] Aba "ADC BASE" encontrada na planilha ativa');
    const baseLinhas = adcBase.getLastRow();
    Logger.log(`  Total de linhas em ADC BASE: ${baseLinhas}`);
  }

  const adcRelatorio = ss.getSheetByName('ADC RELATORIO');
  if (!adcRelatorio) {
    Logger.log('  [AVISO] Aba "ADC RELATORIO" não encontrada — crie a aba antes de rodar o script principal');
  } else {
    Logger.log('  [OK] Aba "ADC RELATORIO" encontrada na planilha ativa');
  }
}
