// ============================================================================
// LA DOLCE BRASIL — GOOGLE APPS SCRIPT (BACKEND OFICIAL DA PLANILHA)
// Mapeamento exato A1 Notation da aba "Visão Geral" (B4:G27),
// além de "Vendas" e "Insumos e Despesas".
// ============================================================================

// ============================================================================
// 1. LEITURA DA PLANILHA (GET) — VISÃO GERAL + INSUMOS E DESPESAS
// ============================================================================
function doGet(e) {
  try {
    var gestao = lerAbaVisaoGeral();
    var despesas = lerAbaDespesas();

    return ContentService.createTextOutput(
      JSON.stringify({
        status: "sucesso",
        gestao: gestao,
        despesas: despesas
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "erro",
        mensagem: err.toString()
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 2. REGISTRO DE VENDAS OU DESPESAS + ATUALIZAÇÃO DA GESTÃO (POST)
// ============================================================================
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var dados = JSON.parse(e.postData.contents);

    // AÇÃO A: Leitura completa via POST
    if (dados.acao === "lerGestao" || dados.acao === "lerTudo") {
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "sucesso",
          gestao: lerAbaVisaoGeral(),
          despesas: lerAbaDespesas()
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // AÇÃO B: Restaurar fórmulas de acerto 50/50 (C25:E25) se solicitado
    if (dados.acao === "restaurarFormulas") {
      restaurarFormulasDeAcerto();
      SpreadsheetApp.flush();
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "sucesso",
          gestao: lerAbaVisaoGeral()
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // AÇÃO C: Registrar Despesa na aba "Insumos e Despesas"
    if (dados.acao === "registrarDespesa" || dados.tipoRegistro === "despesa") {
      return registrarNovaDespesa(ss, dados);
    }

    // AÇÃO D (Padrão): Registrar Venda na aba "Vendas"
    return registrarNovaVenda(ss, dados);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "erro", mensagem: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 2.1 FUNÇÃO PARA REGISTRAR VENDA NA ABA "VENDAS"
// ============================================================================
function registrarNovaVenda(ss, dados) {
  var todasAbas = ss.getSheets();
  var sheet = null;

  for (var i = 0; i < todasAbas.length; i++) {
    var nomeLimpo = todasAbas[i].getName().trim().toLowerCase();
    if (nomeLimpo === "vendas" || nomeLimpo === "venda") {
      sheet = todasAbas[i];
      break;
    }
  }

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "erro", mensagem: "Aba 'Vendas' não encontrada." })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var dataAtual = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  var totalVenda = dados.valorTotal !== undefined ? dados.valorTotal : (dados.quantidade * dados.precoUnitario);

  var novaLinha = [
    dataAtual,                  // Coluna A: Data
    dados.item,                 // Coluna B: Sabor / Tipo
    dados.quantidade,           // Coluna C: Quantidade
    dados.precoUnitario,        // Coluna D: Preço Unitário (R$)
    totalVenda,                 // Coluna E: Total da Venda (R$)
    dados.formaPagamento,       // Coluna F: Forma de Pagamento
    dados.vendedor              // Coluna G: Recebido por (João ou Natan)
  ];

  // Encontra a primeira linha vazia olhando as Colunas A e B
  var ultimaLinha = sheet.getLastRow();
  var linhaDestino = 2;

  if (ultimaLinha >= 2) {
    var valoresAB = sheet.getRange(1, 1, ultimaLinha, 2).getValues();
    linhaDestino = ultimaLinha + 1;
    for (var r = 1; r < valoresAB.length; r++) {
      var colA = String(valoresAB[r][0]).trim();
      var colB = String(valoresAB[r][1]).trim();
      if (colA === "" && colB === "") {
        linhaDestino = r + 1;
        break;
      }
    }
  }

  sheet.getRange(linhaDestino, 1, 1, novaLinha.length).setValues([novaLinha]);
  SpreadsheetApp.flush();

  var gestaoAtualizada = null;
  var despesasAtualizadas = null;
  try {
    gestaoAtualizada = lerAbaVisaoGeral();
    despesasAtualizadas = lerAbaDespesas();
  } catch (ignorar) {}

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "sucesso",
      aba: sheet.getName(),
      linha: linhaDestino,
      gestao: gestaoAtualizada,
      despesas: despesasAtualizadas
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 2.2 FUNÇÃO PARA REGISTRAR DESPESA NA ABA "INSUMOS E DESPESAS"
// ============================================================================
function registrarNovaDespesa(ss, dados) {
  var sheet = localizarAbaDespesas(ss);

  if (!sheet) {
    return ContentService.createTextOutput(
      JSON.stringify({
        status: "erro",
        mensagem: "Aba 'Insumos e Despesas' não encontrada na planilha."
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  var dataLancamento = dados.data
    ? String(dados.data).trim()
    : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");

  var quantidade = Number(dados.quantidade) || 1;
  var valorTotal = Number(dados.valorTotal) || 0;

  // Estrutura exata da aba "Insumos e Despesas" (Colunas A até H)
  var novaLinha = [
    dataLancamento,                    // Coluna A: Data (dd/MM/yyyy)
    dados.categoria || "Ingredientes", // Coluna B: Categoria
    dados.descricao || "",             // Coluna C: Item / Descrição
    quantidade,                        // Coluna D: Quantidade
    valorTotal,                        // Coluna E: Valor Total (R$)
    dados.pagoPor || "Natan",          // Coluna F: Pago por (João ou Natan)
    dados.tipoGasto || "Insumo Direto",// Coluna G: Tipo de Gasto (Insumo Direto ou Gasto Esporádico)
    dados.observacoes || ""            // Coluna H: Observações
  ];

  // Verifica Colunas A (Data) e C (Item / Descrição) para ignorar dropdowns vazios nas Colunas B, F e G
  var ultimaLinha = sheet.getLastRow();
  var linhaDestino = 2;

  if (ultimaLinha >= 2) {
    var valoresAC = sheet.getRange(1, 1, ultimaLinha, 3).getValues();
    linhaDestino = ultimaLinha + 1;
    for (var r = 1; r < valoresAC.length; r++) {
      var colA = String(valoresAC[r][0]).trim();
      var colC = String(valoresAC[r][2]).trim();
      if (colA === "" && colC === "") {
        linhaDestino = r + 1;
        break;
      }
    }
  }

  sheet.getRange(linhaDestino, 1, 1, novaLinha.length).setValues([novaLinha]);
  SpreadsheetApp.flush();

  var gestaoAtualizada = null;
  var despesasAtualizadas = null;
  try {
    gestaoAtualizada = lerAbaVisaoGeral();
    despesasAtualizadas = lerAbaDespesas();
  } catch (ignorar) {}

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "sucesso",
      aba: sheet.getName(),
      linha: linhaDestino,
      gestao: gestaoAtualizada,
      despesas: despesasAtualizadas
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// 3. LEITURA DA ABA "INSUMOS E DESPESAS"
// ============================================================================
function localizarAbaDespesas(ss) {
  var todasAbas = ss.getSheets();
  for (var i = 0; i < todasAbas.length; i++) {
    var nomeLimpo = todasAbas[i].getName().trim().toLowerCase();
    if (
      nomeLimpo === "insumos e despesas" ||
      nomeLimpo === "despesas" ||
      nomeLimpo === "insumos" ||
      nomeLimpo.indexOf("despesa") !== -1
    ) {
      return todasAbas[i];
    }
  }
  return null;
}

function converterMoedaParaNumero(valorStr) {
  if (typeof valorStr === "number") return valorStr;
  var limpo = String(valorStr || "")
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  var num = parseFloat(limpo);
  return isNaN(num) ? 0 : num;
}

function lerAbaDespesas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = localizarAbaDespesas(ss);

  var resultado = {
    itens: [],
    resumo: {
      totalGeral: 0,
      insumosDiretos: 0,
      gastosEsporadicos: 0,
      pagoJoao: 0,
      pagoNatan: 0,
      quantidadeLancamentos: 0
    }
  };

  if (!sheet) return resultado;

  var ultimaLinha = sheet.getLastRow();
  if (ultimaLinha < 2) return resultado;

  var displayRows = sheet.getRange(2, 1, ultimaLinha - 1, 8).getDisplayValues();

  for (var r = 0; r < displayRows.length; r++) {
    var row = displayRows[r];
    var data = String(row[0] || "").trim();
    var categoria = String(row[1] || "").trim();
    var descricao = String(row[2] || "").trim();
    var quantidade = String(row[3] || "").trim();
    var valorTotalFmt = String(row[4] || "").trim();
    var pagoPor = String(row[5] || "").trim();
    var tipoGasto = String(row[6] || "").trim();
    var observacoes = String(row[7] || "").trim();

    if (data === "" && descricao === "") continue;

    var valorNum = converterMoedaParaNumero(valorTotalFmt);

    resultado.itens.push({
      linha: r + 2,
      data: data,
      categoria: categoria || "Outros",
      descricao: descricao,
      quantidade: Number(quantidade) || 1,
      valorTotal: valorTotalFmt || "R$ 0,00",
      valorNumerico: valorNum,
      pagoPor: pagoPor || "—",
      tipoGasto: tipoGasto || "Insumo Direto",
      observacoes: observacoes
    });

    resultado.resumo.totalGeral += valorNum;
    resultado.resumo.quantidadeLancamentos += 1;

    if (tipoGasto.toLowerCase().indexOf("espor") !== -1) {
      resultado.resumo.gastosEsporadicos += valorNum;
    } else {
      resultado.resumo.insumosDiretos += valorNum;
    }

    if (pagoPor.toLowerCase().indexOf("jo") !== -1) {
      resultado.resumo.pagoJoao += valorNum;
    } else if (pagoPor.toLowerCase().indexOf("natan") !== -1) {
      resultado.resumo.pagoNatan += valorNum;
    }
  }

  return resultado;
}

// ============================================================================
// 4. LEITURA PRECISA DA ABA "VISÃO GERAL" (MAPEAMENTO EXATO B4:G27)
// ============================================================================

/**
 * Lê o valor formatado de uma coordenada A1 (ex: "B16", "F10", "C26")
 * a partir da matriz carregada de A1:G30.
 */
function lerCelulaA1(grid, a1) {
  var match = /^([A-Z]+)(\d+)$/i.exec(String(a1 || "").trim());
  if (!match) return "";
  var colIndex = match[1].toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, E=4, F=5, G=6
  var rowIndex = parseInt(match[2], 10) - 1;
  if (rowIndex < 0 || rowIndex >= grid.length) return "";
  if (colIndex < 0 || colIndex >= grid[rowIndex].length) return "";
  return String(grid[rowIndex][colIndex] || "").trim();
}

function lerAbaVisaoGeral() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet =
    ss.getSheetByName("Visão Geral") ||
    ss.getSheetByName("Visao Geral") ||
    ss.getSheets()[0];

  // Lê toda a matriz A1:G30 de uma única vez (rápido e preserva formatação R$ e %)
  var grid = sheet.getRange("A1:G30").getDisplayValues();
  var gridRaw = sheet.getRange("A1:G30").getValues();

  // --------------------------------------------------------------------------
  // SEÇÃO 1: FICHA TÉCNICA & CUSTO UNITÁRIO (B5:G12)
  //   - B6:G9  -> Componentes (Ingredientes, Embalagem, Adesivo, Custos Indiretos)
  //   - F10    -> Custo Total Unitário (=SUM(F6:F9)) | G10 -> Total % (=SUM(G6:G9))
  //   - F11    -> Preço Médio de Venda
  //   - F12    -> Lucro Bruto Unitário (=F11-F10)    | G12 -> Margem Bruta %
  // --------------------------------------------------------------------------
  var itensFicha = [];
  for (var r = 6; r <= 9; r++) {
    var nomeComp = lerCelulaA1(grid, "B" + r);
    if (!nomeComp) continue;

    var custoBaseStr = lerCelulaA1(grid, "D" + r);
    // Se na planilha D6 estiver apenas "200" sem "R$", garante formatação amigável
    if (custoBaseStr && custoBaseStr.indexOf("R$") === -1 && !isNaN(Number(gridRaw[r - 1][3]))) {
      custoBaseStr = "R$ " + Number(gridRaw[r - 1][3]).toFixed(2).replace(".", ",");
    }

    itensFicha.push({
      componente: nomeComp,
      detalhamento: lerCelulaA1(grid, "C" + r),
      custoBase: custoBaseStr || "R$ 0,00",
      rendimento: lerCelulaA1(grid, "E" + r) || "1",
      custoUnitario: lerCelulaA1(grid, "F" + r) || "R$ 0,00",
      percentual: lerCelulaA1(grid, "G" + r) || "0,0%"
    });
  }

  var precoMedioStr = lerCelulaA1(grid, "F11") || "R$ 0,00";
  if (precoMedioStr.indexOf("R$") === -1 && !isNaN(Number(gridRaw[10][5])) && Number(gridRaw[10][5]) > 0) {
    precoMedioStr = "R$ " + Number(gridRaw[10][5]).toFixed(2).replace(".", ",");
  }

  var fichaTecnica = {
    itens: itensFicha,
    custoTotalUnitario: lerCelulaA1(grid, "F10") || "R$ 0,00",
    totalPercentual: lerCelulaA1(grid, "G10") || "100%",
    precoMedioVenda: precoMedioStr,
    lucroBrutoUnitario: lerCelulaA1(grid, "F12") || "R$ 0,00",
    margemBrutaUnitaria: lerCelulaA1(grid, "G12") || "0,0%"
  };

  // --------------------------------------------------------------------------
  // SEÇÃO 2: PAINEL DE INDICADORES GERAIS (KPIs) (B15:G17)
  //   - B16 / B17       -> Receita Total Bruta / Total palhas vendidas
  //   - C16:D16 / C17   -> Despesas Totais / Gastos Esporádicos
  //   - E16 / E17       -> Lucro Líquido Geral / Subtítulo Lucro
  //   - F16:G16 / F17   -> Margem Operacional / Status da Operação
  // --------------------------------------------------------------------------
  var indicadores = {
    receitaBruta: lerCelulaA1(grid, "B16") || "R$ 0,00",
    receitaSub: lerCelulaA1(grid, "B17") || "Total: 0 palhas vendidas",
    despesasTotais: lerCelulaA1(grid, "C16") || "R$ 0,00",
    despesasSub: lerCelulaA1(grid, "C17") || "Gastos Esporádicos: R$ 0,00",
    lucroLiquido: lerCelulaA1(grid, "E16") || "R$ 0,00",
    lucroSub: lerCelulaA1(grid, "E17") || "Divisão igualitária (50% cada)",
    margemOperacional: lerCelulaA1(grid, "F16") || "0,0%",
    margemSub: lerCelulaA1(grid, "F17") || "—"
  };

  // --------------------------------------------------------------------------
  // SEÇÃO 3: DIVISÃO SOCIETÁRIA & ACERTO DE CONTAS (B20:G27)
  //   - Linhas 21 a 25:
  //       Linha 21: Receitas Recebidas     (B21, João=C21, Natan=D21, Total=E21, Regra=F21, Obs=G21)
  //       Linha 22: Despesas Pagas         (B22, João=C22, Natan=D22, Total=E22, Regra=F22, Obs=G22)
  //       Linha 23: Parcela Justa Despesas (B23, João=C23, Natan=D23, Total=E23, Regra=F23, Obs=G23)
  //       Linha 24: Lucro Líquido Justo    (B24, João=C24, Natan=D24, Total=E24, Regra=F24, Obs=G24)
  //       Linha 25: Saldo de Compensação   (B25, João=C25, Natan=D25, Total=E25, Regra=F25, Obs=G25)
  //   - C26:G26 (mesclada) -> Resolução Final do Acerto (Pix)
  //   - Linha 27           -> D27 (Insumo Direto), F27 (Gasto Esporádico), G27 (Total Saídas)
  // --------------------------------------------------------------------------
  var padroesLinhasSocios = [
    { linha: 21, metricaPadrao: "(+) Receitas Recebidas", regraPadrao: "50% para cada", obsPadrao: "Arrecadado por sócio" },
    { linha: 22, metricaPadrao: "(-) Despesas Pagas", regraPadrao: "50% para cada", obsPadrao: "Desembolsado do próprio bolso" },
    { linha: 23, metricaPadrao: "(=) Parcela Justa Despesas (50%)", regraPadrao: "50% / 50%", obsPadrao: "Metade dos custos totais" },
    { linha: 24, metricaPadrao: "(=) Lucro Líquido Justo (50%)", regraPadrao: "50% / 50%", obsPadrao: "Metade do lucro líquido real" },
    { linha: 25, metricaPadrao: "(=) Saldo de Compensação", regraPadrao: "Equilíbrio (R$ 0,00)", obsPadrao: "(Despesas + Lucro) - Receitas" }
  ];

  var divisaoSocios = [];
  for (var i = 0; i < padroesLinhasSocios.length; i++) {
    var cfg = padroesLinhasSocios[i];
    var L = cfg.linha;
    divisaoSocios.push({
      metrica: lerCelulaA1(grid, "B" + L) || cfg.metricaPadrao,
      joao: lerCelulaA1(grid, "C" + L) || "R$ 0,00",
      natan: lerCelulaA1(grid, "D" + L) || "R$ 0,00",
      total: lerCelulaA1(grid, "E" + L) || "R$ 0,00",
      regra: lerCelulaA1(grid, "F" + L) || cfg.regraPadrao,
      observacao: lerCelulaA1(grid, "G" + L) || cfg.obsPadrao
    });
  }

  // Objeto estruturado de conciliação societária (Matriz C21:E25)
  var dadosSocio = {
    joao: {
      recebido: lerCelulaA1(grid, "C21") || "R$ 0,00",
      gasto: lerCelulaA1(grid, "C22") || "R$ 0,00",
      parcelaJusta: lerCelulaA1(grid, "C23") || "R$ 0,00",
      lucroEsperado: lerCelulaA1(grid, "C24") || "R$ 0,00",
      saldoCompensacao: lerCelulaA1(grid, "C25") || "R$ 0,00",
      saldoNumerico: Number(gridRaw[24][2]) || 0
    },
    natan: {
      recebido: lerCelulaA1(grid, "D21") || "R$ 0,00",
      gasto: lerCelulaA1(grid, "D22") || "R$ 0,00",
      parcelaJusta: lerCelulaA1(grid, "D23") || "R$ 0,00",
      lucroEsperado: lerCelulaA1(grid, "D24") || "R$ 0,00",
      saldoCompensacao: lerCelulaA1(grid, "D25") || "R$ 0,00",
      saldoNumerico: Number(gridRaw[24][3]) || 0
    },
    consolidado: {
      totalReceita: lerCelulaA1(grid, "E21") || "R$ 0,00",
      totalDespesa: lerCelulaA1(grid, "E22") || "R$ 0,00",
      totalLucro: lerCelulaA1(grid, "E24") || "R$ 0,00",
      saldoEquilibrio: lerCelulaA1(grid, "E25") || "R$ 0,00"
    }
  };

  // Resolução Final do Acerto (C26:G26 mesclada)
  var resolucaoAcerto =
    lerCelulaA1(grid, "C26") ||
    lerCelulaA1(grid, "B26") ||
    "✅ Contas 100% equilibradas! Nenhuma transferência necessária.";

  // Linha 27: Detalhamento de Saídas (D27 = Insumo Direto, F27 = Gasto Esporádico, G27 = Total)
  var saidas = {
    insumosDiretos: lerCelulaA1(grid, "D27") || "R$ 0,00",
    gastosEsporadicos: lerCelulaA1(grid, "F27") || "R$ 0,00",
    totalSaidas: lerCelulaA1(grid, "G27") || "R$ 0,00"
  };

  return {
    fichaTecnica: fichaTecnica,
    indicadores: indicadores,
    divisaoSocios: divisaoSocios,
    dadosSocio: dadosSocio,
    resolucaoAcerto: resolucaoAcerto,
    saidas: saidas
  };
}

/**
 * Utilitário para injetar/restaurar as fórmulas de compensação societária (C25:E25)
 */
function restaurarFormulasDeAcerto() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Visão Geral");
  if (!sheet) return;
  sheet.getRange("C25").setFormula("=(C22+C24)-C21");
  sheet.getRange("D25").setFormula("=(D22+D24)-D21");
  sheet.getRange("E25").setFormula("=C25+D25");
}
