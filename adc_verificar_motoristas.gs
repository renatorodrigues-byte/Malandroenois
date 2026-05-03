// ============================================================
// CONFIGURAÇÃO - ajuste se necessário
// ============================================================
const EXTERNAL_SHEET_ID = '1ExFP9LbhEQKLTShn3iM_5UsYBdETivTk81qH8EcwNFI';

// Coluna da planilha ROTA HOJE que contém o HORÁRIO do motorista
// (coluna D = índice 3, coluna E = índice 4, etc.)
const ROTA_HOJE_COLUNA_HORARIO = 4; // << AJUSTE SE NECESSÁRIO (4 = coluna E)
// ============================================================

function verificarMotoristas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const adcBase = ss.getSheetByName('ADC BASE');
  const adcRelatorio = ss.getSheetByName('ADC RELATORIO');

  if (!adcBase)     { SpreadsheetApp.getUi().alert('Aba "ADC BASE" não encontrada.');     return; }
  if (!adcRelatorio){ SpreadsheetApp.getUi().alert('Aba "ADC RELATORIO" não encontrada.'); return; }

  // Abre a planilha externa
  let externalSs;
  try {
    externalSs = SpreadsheetApp.openById(EXTERNAL_SHEET_ID);
  } catch (e) {
    SpreadsheetApp.getUi().alert('Não foi possível abrir a planilha externa. Verifique as permissões.');
    return;
  }

  const rotaHoje = externalSs.getSheetByName('ROTA HOJE');
  if (!rotaHoje) { SpreadsheetApp.getUi().alert('Aba "ROTA HOJE" não encontrada na planilha externa.'); return; }

  // Lê todos os dados de ADC BASE (excluindo cabeçalho - linha 1)
  const baseData    = adcBase.getDataRange().getValues();
  // Lê todos os dados de ROTA HOJE
  const rotaData    = rotaHoje.getDataRange().getValues();
  const rotaLength  = rotaData.length;

  // Prepara ADC RELATORIO
  adcRelatorio.clearContents();
  adcRelatorio.appendRow(['Motorista', 'Horário Final (ADC BASE)', 'Horário Encontrado (ROTA HOJE)']);

  const resultados = [];

  // Percorre ADC BASE a partir da linha 2 (índice 1 = ignora cabeçalho)
  for (let i = 1; i < baseData.length; i++) {
    const cValor       = baseData[i][2]; // Coluna C
    const motorista    = baseData[i][0]; // Coluna A
    const horarioFinal = baseData[i][1]; // Coluna B

    // Só processa quando coluna C = 0
    if (String(cValor).trim() !== '0') continue;
    if (!motorista || String(motorista).trim() === '') continue;

    const nomeMotorista = String(motorista).trim();

    // Busca o motorista na coluna D de ROTA HOJE — de baixo para cima
    let horarioEncontrado = null;
    for (let j = rotaLength - 1; j >= 0; j--) {
      const celulaDColuna = String(rotaData[j][3]).trim(); // Coluna D = índice 3
      if (celulaDColuna.toLowerCase() === nomeMotorista.toLowerCase()) {
        horarioEncontrado = rotaData[j][ROTA_HOJE_COLUNA_HORARIO];
        break;
      }
    }

    if (horarioEncontrado === null || horarioEncontrado === '') continue;

    // Compara os horários
    const minFinal      = converterParaMinutos(horarioFinal);
    const minEncontrado = converterParaMinutos(horarioEncontrado);

    // Se horário final > horário encontrado → registra
    if (minFinal > minEncontrado) {
      resultados.push([nomeMotorista, horarioFinal, horarioEncontrado]);
    }
  }

  // Grava resultados em ADC RELATORIO
  if (resultados.length > 0) {
    adcRelatorio
      .getRange(2, 1, resultados.length, 3)
      .setValues(resultados);

    // Formata colunas de horário como HH:mm
    const formatoHora = 'HH:mm';
    adcRelatorio.getRange(2, 2, resultados.length, 1).setNumberFormat(formatoHora);
    adcRelatorio.getRange(2, 3, resultados.length, 1).setNumberFormat(formatoHora);
  }

  SpreadsheetApp.getUi().alert(
    resultados.length > 0
      ? `Concluído! ${resultados.length} ocorrência(s) registrada(s) em "ADC RELATORIO".`
      : 'Nenhuma ocorrência encontrada.'
  );
}

/**
 * Converte horário (número fracionário do Sheets, string "HH:mm" ou Date) para minutos.
 */
function converterParaMinutos(valor) {
  if (valor instanceof Date) {
    return valor.getHours() * 60 + valor.getMinutes();
  }
  if (typeof valor === 'number') {
    // Sheets armazena horário como fração do dia (0 a 1)
    return Math.round(valor * 24 * 60);
  }
  if (typeof valor === 'string') {
    const partes = valor.trim().split(':');
    if (partes.length >= 2) {
      return parseInt(partes[0], 10) * 60 + parseInt(partes[1], 10);
    }
  }
  return -1;
}

// ============================================================
// Adiciona menu personalizado ao abrir a planilha
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ADC Scripts')
    .addItem('Verificar Motoristas', 'verificarMotoristas')
    .addToUi();
}
