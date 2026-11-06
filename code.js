// URL que você copiou no passo 8 do Apps Script
const urlPlanilha = "https://script.google.com/macros/s/AKfycbzuZGukDeqqI32xmYR_Px4w-TeEcHES-DL5FzolcraJFpfemW0CN9eyTUBvYvrzCaJX7g/exec";

// ============================================================================
// CONFIGURAÇÃO DE SENHAS DOS VENDEDORES
// Altere aqui caso queira mudar a senha do Natan ou do João
// ============================================================================
const SENHAS_VENDEDORES = {
  "1234": "Natan",
  "4321": "João"
};

const PRECO_UNITARIO_SUGERIDO = 6.00;

// Estado da aplicação
const appState = {
  vendedorLogado: null, // "Natan" ou "João"
  itemSelecionado: "Chocolate com Leite Ninho",
  isProdutoAtivo: true,
  quantidade: 1,
  valorTotal: 6.00,
  formaPagamento: "Pix",
  enviando: false
};

// ============================================================================
// ELEMENTOS DO DOM
// ============================================================================
const brandHeader = document.getElementById("brandHeader");
const headerSellerPill = document.getElementById("headerSellerPill");
const headerSellerName = document.getElementById("headerSellerName");

const tabBtnLogin = document.getElementById("tabBtnLogin");
const tabBtnSales = document.getElementById("tabBtnSales");
const tabBtnExpenses = document.getElementById("tabBtnExpenses");
const tabBtnFinance = document.getElementById("tabBtnFinance");
const tabLogin = document.getElementById("tabLogin");
const tabSales = document.getElementById("tabSales");
const tabExpenses = document.getElementById("tabExpenses");
const tabFinance = document.getElementById("tabFinance");
const salesTabLockBadge = document.getElementById("salesTabLockBadge");
const expensesTabLockBadge = document.getElementById("expensesTabLockBadge");
const financeTabLockBadge = document.getElementById("financeTabLockBadge");

// Login
const loginForm = document.getElementById("loginForm");
const loginFormCard = document.getElementById("loginFormCard");
const loggedSellerCard = document.getElementById("loggedSellerCard");
const sellerPasswordInput = document.getElementById("sellerPasswordInput");
const togglePassBtn = document.getElementById("togglePassBtn");
const loginErrorMsg = document.getElementById("loginErrorMsg");
const sellerAvatarInitial = document.getElementById("sellerAvatarInitial");
const loggedSellerName = document.getElementById("loggedSellerName");
const goToSalesBtn = document.getElementById("goToSalesBtn");
const goToExpensesBtn = document.getElementById("goToExpensesBtn");
const goToFinanceBtn = document.getElementById("goToFinanceBtn");
const logoutSellerBtn = document.getElementById("logoutSellerBtn");

// Teclado PIN
const pinKeys = document.querySelectorAll(".pin-key[data-digit]");
const pinClearBtn = document.getElementById("pinClearBtn");
const pinBackBtn = document.getElementById("pinBackBtn");

// Vendas
const salesForm = document.getElementById("salesForm");
const productCard = document.getElementById("productCard");
const productStatusHint = document.getElementById("productStatusHint");
const saleDetailsBox = document.getElementById("saleDetailsBox");

const qtyMinusBtn = document.getElementById("qtyMinusBtn");
const qtyPlusBtn = document.getElementById("qtyPlusBtn");
const qtyInput = document.getElementById("qtyInput");
const qtyChips = document.querySelectorAll(".qty-chip");

const totalPriceInput = document.getElementById("totalPriceInput");
const priceChips = document.querySelectorAll(".price-chip");
const calculatedUnitPrice = document.getElementById("calculatedUnitPrice");

const paymentOptions = document.querySelectorAll(".payment-option");

const summarySeller = document.getElementById("summarySeller");
const summaryItem = document.getElementById("summaryItem");
const summaryPayment = document.getElementById("summaryPayment");
const summaryQtyLabel = document.getElementById("summaryQtyLabel");
const summaryTotalValue = document.getElementById("summaryTotalValue");
const submitSaleBtn = document.getElementById("submitSaleBtn");

// Toast iOS
const iosToast = document.getElementById("iosToast");
const toastIcon = document.getElementById("toastIcon");
const toastText = document.getElementById("toastText");
let toastTimeout = null;

// ============================================================================
// FUNÇÕES UTILITÁRIAS
// ============================================================================
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function mostrarNotificacao(mensagem, tipo = "success") {
  if (toastTimeout) clearTimeout(toastTimeout);

  toastText.textContent = mensagem;
  toastIcon.className = `toast-icon ${tipo}`;

  if (tipo === "success") {
    toastIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`;
  } else {
    toastIcon.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>`;
  }

  iosToast.classList.add("show");
  toastTimeout = setTimeout(() => {
    iosToast.classList.remove("show");
  }, 3200);
}

// ============================================================================
// NAVEGAÇÃO ENTRE ABAS (1ª: LOGIN | 2ª: VENDAS | 3ª: DESPESAS | 4ª: GESTÃO)
// ============================================================================
function alternarAba(abaDestino) {
  if (
    (abaDestino === "tabSales" || abaDestino === "tabExpenses" || abaDestino === "tabFinance") &&
    !appState.vendedorLogado
  ) {
    mostrarNotificacao("Digite a senha do vendedor para acessar o painel", "error");
    sellerPasswordInput.focus();
    return;
  }

  tabLogin.classList.toggle("active", abaDestino === "tabLogin");
  tabSales.classList.toggle("active", abaDestino === "tabSales");
  if (tabExpenses) tabExpenses.classList.toggle("active", abaDestino === "tabExpenses");
  tabFinance.classList.toggle("active", abaDestino === "tabFinance");

  tabBtnLogin.classList.toggle("active", abaDestino === "tabLogin");
  tabBtnSales.classList.toggle("active", abaDestino === "tabSales");
  if (tabBtnExpenses) tabBtnExpenses.classList.toggle("active", abaDestino === "tabExpenses");
  tabBtnFinance.classList.toggle("active", abaDestino === "tabFinance");

  // Header mais compacto nas telas operacionais
  brandHeader.classList.toggle("compact", abaDestino !== "tabLogin");

  if (abaDestino === "tabFinance" || abaDestino === "tabExpenses") {
    carregarDadosGestao(false);
  }
}

tabBtnLogin.addEventListener("click", () => alternarAba("tabLogin"));
tabBtnSales.addEventListener("click", () => alternarAba("tabSales"));
if (tabBtnExpenses) {
  tabBtnExpenses.addEventListener("click", () => alternarAba("tabExpenses"));
}
tabBtnFinance.addEventListener("click", () => alternarAba("tabFinance"));

// ============================================================================
// LÓGICA DE LOGIN (APENAS SENHA -> IDENTIFICA NATAN OU JOÃO)
// ============================================================================
function autenticarComSenha(senhaDigitada) {
  const senhaLimpa = String(senhaDigitada).trim();
  const vendedor = SENHAS_VENDEDORES[senhaLimpa];

  if (!vendedor) {
    loginErrorMsg.textContent = "Senha inválida. Tente novamente.";
    sellerPasswordInput.select();
    return false;
  }

  // Sucesso no login
  appState.vendedorLogado = vendedor;
  loginErrorMsg.textContent = "";
  sellerPasswordInput.value = "";

  atualizarInterfaceVendedor();
  atualizarResumoVenda();

  mostrarNotificacao(`Bem-vindo, ${vendedor}!`);
  alternarAba("tabSales");
  return true;
}

function atualizarInterfaceVendedor() {
  const logado = Boolean(appState.vendedorLogado);

  loginFormCard.classList.toggle("hidden", logado);
  loggedSellerCard.classList.toggle("hidden", !logado);
  headerSellerPill.classList.toggle("hidden", !logado);
  salesTabLockBadge.classList.toggle("hidden", logado);
  if (expensesTabLockBadge) {
    expensesTabLockBadge.classList.toggle("hidden", logado);
  }
  if (financeTabLockBadge) {
    financeTabLockBadge.classList.toggle("hidden", logado);
  }

  if (logado) {
    headerSellerName.textContent = appState.vendedorLogado;
    loggedSellerName.textContent = appState.vendedorLogado;
    sellerAvatarInitial.textContent = appState.vendedorLogado.charAt(0).toUpperCase();
    summarySeller.textContent = appState.vendedorLogado;
    if (typeof selecionarPagadorDespesa === "function") {
      selecionarPagadorDespesa(appState.vendedorLogado);
    }
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  autenticarComSenha(sellerPasswordInput.value);
});

// Teclado numérico rápido estilo iPhone
pinKeys.forEach((btn) => {
  btn.addEventListener("click", () => {
    loginErrorMsg.textContent = "";
    if (sellerPasswordInput.value.length < 12) {
      sellerPasswordInput.value += btn.dataset.digit;
      // Se a senha digitada já bater com um vendedor, entra automaticamente
      if (SENHAS_VENDEDORES[sellerPasswordInput.value]) {
        setTimeout(() => autenticarComSenha(sellerPasswordInput.value), 120);
      }
    }
  });
});

pinClearBtn.addEventListener("click", () => {
  sellerPasswordInput.value = "";
  loginErrorMsg.textContent = "";
});

pinBackBtn.addEventListener("click", () => {
  sellerPasswordInput.value = sellerPasswordInput.value.slice(0, -1);
  loginErrorMsg.textContent = "";
});

togglePassBtn.addEventListener("click", () => {
  const isPass = sellerPasswordInput.type === "password";
  sellerPasswordInput.type = isPass ? "text" : "password";
});

goToSalesBtn.addEventListener("click", () => alternarAba("tabSales"));
if (goToExpensesBtn) {
  goToExpensesBtn.addEventListener("click", () => alternarAba("tabExpenses"));
}
if (goToFinanceBtn) {
  goToFinanceBtn.addEventListener("click", () => alternarAba("tabFinance"));
}

logoutSellerBtn.addEventListener("click", () => {
  appState.vendedorLogado = null;
  atualizarInterfaceVendedor();
  alternarAba("tabLogin");
  mostrarNotificacao("Sessão encerrada");
});

// ============================================================================
// LÓGICA DA ABA DE VENDAS (DOCE, QUANTIDADE, VALOR E PAGAMENTO)
// ============================================================================

// 1. Seleção do Doce (Palha Italiana de Chocolate com Leite Ninho)
productCard.addEventListener("click", () => {
  appState.isProdutoAtivo = !appState.isProdutoAtivo;
  productCard.classList.toggle("selected", appState.isProdutoAtivo);
  productCard.setAttribute("aria-pressed", String(appState.isProdutoAtivo));
  saleDetailsBox.classList.toggle("disabled-section", !appState.isProdutoAtivo);
  productStatusHint.textContent = appState.isProdutoAtivo
    ? "Selecionado"
    : "Toque para selecionar";
});

// 2. Controle de Quantidade
function definirQuantidade(novaQtd, atualizarValorSugerido = true) {
  const qtd = Math.max(1, Math.min(999, parseInt(novaQtd, 10) || 1));
  appState.quantidade = qtd;
  qtyInput.value = qtd;

  qtyChips.forEach((chip) => {
    chip.classList.toggle("active", parseInt(chip.dataset.qty, 10) === qtd);
  });

  if (atualizarValorSugerido) {
    const sugerido = (qtd * PRECO_UNITARIO_SUGERIDO).toFixed(2);
    totalPriceInput.value = sugerido;
    appState.valorTotal = parseFloat(sugerido);

    priceChips.forEach((chip) => {
      chip.classList.toggle("active", parseFloat(chip.dataset.price) === appState.valorTotal);
    });
  }

  atualizarResumoVenda();
}

qtyMinusBtn.addEventListener("click", () => {
  definirQuantidade(appState.quantidade - 1, true);
});

qtyPlusBtn.addEventListener("click", () => {
  definirQuantidade(appState.quantidade + 1, true);
});

qtyInput.addEventListener("input", () => {
  const val = parseInt(qtyInput.value, 10);
  if (val > 0) {
    appState.quantidade = val;
    qtyChips.forEach((chip) => {
      chip.classList.toggle("active", parseInt(chip.dataset.qty, 10) === val);
    });
    atualizarResumoVenda();
  }
});

qtyChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    definirQuantidade(parseInt(chip.dataset.qty, 10), true);
  });
});

// 3. Controle do Valor Total Vendido (calcula o preço unitário automaticamente)
totalPriceInput.addEventListener("input", () => {
  const valor = parseFloat(totalPriceInput.value);
  appState.valorTotal = isNaN(valor) || valor < 0 ? 0 : valor;

  priceChips.forEach((chip) => {
    chip.classList.toggle("active", parseFloat(chip.dataset.price) === appState.valorTotal);
  });

  atualizarResumoVenda();
});

priceChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const preco = parseFloat(chip.dataset.price);
    appState.valorTotal = preco;
    totalPriceInput.value = preco.toFixed(2);

    priceChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    atualizarResumoVenda();
  });
});

// 4. Seleção da Forma de Pagamento
paymentOptions.forEach((option) => {
  option.addEventListener("click", () => {
    paymentOptions.forEach((opt) => {
      opt.classList.remove("selected");
      opt.setAttribute("aria-checked", "false");
    });
    option.classList.add("selected");
    option.setAttribute("aria-checked", "true");

    appState.formaPagamento = option.dataset.payment;
    atualizarResumoVenda();
  });
});

// Atualiza o painel de cálculo de preço unitário e resumo
function atualizarResumoVenda() {
  const qtd = Math.max(1, appState.quantidade);
  const total = Math.max(0, appState.valorTotal);
  const precoUnitario = total / qtd;

  calculatedUnitPrice.textContent = `${formatarMoeda(precoUnitario)} / un.`;
  summarySeller.textContent = appState.vendedorLogado || "—";
  summaryItem.textContent = "Palha Italiana (Choc. c/ Ninho)";
  summaryPayment.textContent = appState.formaPagamento;
  summaryQtyLabel.textContent = `Total (${qtd} ${qtd === 1 ? "unidade" : "unidades"})`;
  summaryTotalValue.textContent = formatarMoeda(total);
}

// ============================================================================
// ENVIO DOS DADOS PARA O GOOGLE SHEETS
// ============================================================================
salesForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (appState.enviando) return;

  if (!appState.vendedorLogado) {
    mostrarNotificacao("Faça login com sua senha primeiro!", "error");
    alternarAba("tabLogin");
    return;
  }

  if (!appState.isProdutoAtivo) {
    mostrarNotificacao("Selecione o doce antes de registrar a venda", "error");
    return;
  }

  const quantidade = Math.max(1, parseInt(qtyInput.value, 10) || 1);
  const valorTotal = parseFloat(totalPriceInput.value);

  if (isNaN(valorTotal) || valorTotal <= 0) {
    mostrarNotificacao("Informe por quanto foi vendido", "error");
    totalPriceInput.focus();
    return;
  }

  const precoUnitario = Number((valorTotal / quantidade).toFixed(2));

  // Dados capturados do seu formulário no web app
  const dadosDaVenda = {
    item: appState.itemSelecionado, // "Palha Italiana de Chocolate com Leite Ninho"
    quantidade: quantidade,
    precoUnitario: precoUnitario,
    valorTotal: Number(valorTotal.toFixed(2)),
    formaPagamento: appState.formaPagamento,
    vendedor: appState.vendedorLogado // "Natan" ou "João"
  };

  // Estado visual de carregamento no botão
  appState.enviando = true;
  submitSaleBtn.disabled = true;
  const conteudoOriginalBtn = submitSaleBtn.innerHTML;
  submitSaleBtn.innerHTML = `<div class="spinner"></div><span>Salvando na planilha...</span>`;

  // Enviando para o Google Sheets
  fetch(urlPlanilha, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(dadosDaVenda)
  })
    .then(async (response) => {
      const texto = await response.text();
      let data;
      try {
        data = JSON.parse(texto);
      } catch {
        throw new Error(
          "O Google Apps Script não retornou JSON válido. Verifique se doPost(e) está fora de myFunction() e se a implantação está liberada para 'Qualquer pessoa'."
        );
      }
      if (data.status && data.status !== "sucesso" && data.status !== "ok") {
        throw new Error(data.mensagem || "Erro retornado pela planilha.");
      }
      return data;
    })
    .then((data) => {
      console.log("Venda registrada com sucesso:", data);
      const detalheLocal =
        data && data.aba && data.linha ? ` (${data.aba}, linha ${data.linha})` : "";
      mostrarNotificacao(
        `Venda de ${formatarMoeda(valorTotal)} salva${detalheLocal}!`,
        "success"
      );

      // Reseta para 1 unidade mantendo o vendedor logado para a próxima venda
      definirQuantidade(1, true);

      // Se o Apps Script já devolveu os dados atualizados de gestão ou para atualizar em background
      if (data && data.gestao) {
        renderizarPainelGestao(data.gestao);
      } else {
        carregarDadosGestao(false);
      }
    })
    .catch((error) => {
      console.error("Erro ao salvar:", error);
      mostrarNotificacao(
        error.message || "Erro ao conectar com a planilha. Verifique o Apps Script.",
        "error"
      );
    })
    .finally(() => {
      appState.enviando = false;
      submitSaleBtn.disabled = false;
      submitSaleBtn.innerHTML = conteudoOriginalBtn;
    });
});

// ============================================================================
// ABA 3: GESTÃO FINANCEIRA & PRECIFICAÇÃO (LEITURA DA ABA "VISÃO GERAL")
// ============================================================================
const refreshFinanceBtn = document.getElementById("refreshFinanceBtn");
const syncBtnLabel = document.getElementById("syncBtnLabel");
const financeSyncDot = document.getElementById("financeSyncDot");
const financeLastSyncText = document.getElementById("financeLastSyncText");

// Estado base inicial (espelhado da aba "Visão Geral" da planilha)
const DADOS_FINANCEIROS_PADRAO = {
  fichaTecnica: {
    itens: [
      {
        componente: "Ingredientes da Receita Base",
        detalhamento: "Leite cond., biscoito maisena, cacau 50%, manteiga",
        custoBase: "R$ 32,50",
        rendimento: "25",
        custoUnitario: "R$ 1,30",
        percentual: "67,4%"
      },
      {
        componente: "Embalagem Individual",
        detalhamento: "Saquinho celofane 10x15 + fitilho",
        custoBase: "R$ 18,00",
        rendimento: "100",
        custoUnitario: "R$ 0,18",
        percentual: "9,3%"
      },
      {
        componente: "Adesivo / Tag da Marca",
        detalhamento: "Adesivo redondo personalizado com logo",
        custoBase: "R$ 25,00",
        rendimento: "100",
        custoUnitario: "R$ 0,25",
        percentual: "13,0%"
      },
      {
        componente: "Custos Indiretos (Gás / Energia)",
        detalhamento: "Estimativa proporcional por receita/lote",
        custoBase: "R$ 5,00",
        rendimento: "25",
        custoUnitario: "R$ 0,20",
        percentual: "10,4%"
      }
    ],
    custoTotalUnitario: "R$ 1,93",
    precoMedioVenda: "R$ 10,00",
    lucroBrutoUnitario: "R$ 8,07",
    margemBrutaUnitaria: "80,7%"
  },
  indicadores: {
    receitaBruta: "R$ 46,00",
    receitaSub: "Total: 7 palhas vendidas",
    despesasTotais: "R$ 338,50",
    despesasSub: "Gastos Esporádicos: R$ 62,00",
    lucroLiquido: "-R$ 292,50",
    lucroSub: "Divisão igualitária (50% cada)",
    margemOperacional: "-635,9%",
    margemSub: "Prejuízo"
  },
  divisaoSocios: [
    {
      metrica: "(+) Receitas Recebidas (Em Mãos/Conta)",
      joao: "R$ 0,00",
      natan: "R$ 46,00",
      total: "R$ 46,00",
      regra: "50% para cada",
      observacao: "Dinheiro arrecadado por sócio"
    },
    {
      metrica: "(-) Despesas Pagas do Próprio Bolso",
      joao: "R$ 233,50",
      natan: "R$ 105,00",
      total: "R$ 338,50",
      regra: "50% para cada",
      observacao: "Gastos adiantados por sócio"
    },
    {
      metrica: "(=) Parcela Justa das Despesas (50%)",
      joao: "R$ 169,25",
      natan: "R$ 169,25",
      total: "R$ 338,50",
      regra: "50% / 50%",
      observacao: "Custo de responsabilidade de cada sócio"
    },
    {
      metrica: "(=) Lucro Líquido a Receber (50%)",
      joao: "-R$ 146,25",
      natan: "-R$ 146,25",
      total: "-R$ 292,50",
      regra: "50% / 50%",
      observacao: "Metade do lucro total realizado"
    },
    {
      metrica: "(=) Saldo Líquido de Compensação",
      joao: "R$ 87,25",
      natan: "-R$ 87,25",
      total: "R$ 0,00",
      regra: "Equilíbrio (R$ 0,00)",
      observacao: "Posição final de acerto"
    }
  ],
  resolucaoAcerto: "👉 NATAN deve transferir via Pix para JOÃO o valor de R$ 87,25",
  saidas: {
    insumosDiretos: "R$ 276,50",
    gastosEsporadicos: "R$ 62,00",
    totalSaidas: "R$ 338,50"
  }
};

function ehValorNegativo(textoValor) {
  return String(textoValor || "").trim().includes("-");
}

function classeCorValor(textoValor, colorirPositivo = false) {
  const str = String(textoValor || "").trim();
  if (str.includes("-")) return "text-neg";
  if (colorirPositivo && str !== "R$ 0,00" && str !== "0,0%" && str !== "-") return "text-pos";
  return "";
}

function renderizarPainelGestao(dados) {
  if (!dados) return;

  const ft = dados.fichaTecnica || DADOS_FINANCEIROS_PADRAO.fichaTecnica;
  const ind = dados.indicadores || DADOS_FINANCEIROS_PADRAO.indicadores;
  const div =
    Array.isArray(dados.divisaoSocios) && dados.divisaoSocios.length > 0
      ? dados.divisaoSocios
      : DADOS_FINANCEIROS_PADRAO.divisaoSocios;
  const saidas = dados.saidas || DADOS_FINANCEIROS_PADRAO.saidas;
  const resolucao = dados.resolucaoAcerto || DADOS_FINANCEIROS_PADRAO.resolucaoAcerto;

  // 1. Hero Resolução Final do Acerto
  const finResolucaoTexto = document.getElementById("finResolucaoTexto");
  const finHeroSaldoJoao = document.getElementById("finHeroSaldoJoao");
  const finHeroSaldoNatan = document.getElementById("finHeroSaldoNatan");
  const finEquilibrioTag = document.getElementById("finEquilibrioTag");

  if (finResolucaoTexto) finResolucaoTexto.textContent = resolucao;

  const linhaSaldo = div.find((d) =>
    String(d.metrica).toLowerCase().includes("saldo líquido")
  );
  if (linhaSaldo) {
    if (finHeroSaldoJoao) {
      finHeroSaldoJoao.textContent = linhaSaldo.joao;
      finHeroSaldoJoao.className = `partner-pill-val ${
        ehValorNegativo(linhaSaldo.joao) ? "val-negative" : "val-positive"
      }`;
    }
    if (finHeroSaldoNatan) {
      finHeroSaldoNatan.textContent = linhaSaldo.natan;
      finHeroSaldoNatan.className = `partner-pill-val ${
        ehValorNegativo(linhaSaldo.natan) ? "val-negative" : "val-positive"
      }`;
    }
    if (finEquilibrioTag && linhaSaldo.regra) {
      finEquilibrioTag.textContent = linhaSaldo.regra;
    }
  }

  // 2. Indicadores Gerais do Negócio (Bento Grid)
  const kpiReceitaValor = document.getElementById("kpiReceitaValor");
  const kpiReceitaSub = document.getElementById("kpiReceitaSub");
  const kpiDespesasValor = document.getElementById("kpiDespesasValor");
  const kpiDespesasSub = document.getElementById("kpiDespesasSub");
  const kpiLucroBox = document.getElementById("kpiLucroBox");
  const kpiLucroValor = document.getElementById("kpiLucroValor");
  const kpiLucroSub = document.getElementById("kpiLucroSub");
  const kpiMargemBox = document.getElementById("kpiMargemBox");
  const kpiMargemValor = document.getElementById("kpiMargemValor");
  const kpiMargemSub = document.getElementById("kpiMargemSub");

  if (kpiReceitaValor) kpiReceitaValor.textContent = ind.receitaBruta;
  if (kpiReceitaSub) kpiReceitaSub.textContent = ind.receitaSub;
  if (kpiDespesasValor) kpiDespesasValor.textContent = ind.despesasTotais;
  if (kpiDespesasSub) kpiDespesasSub.textContent = ind.despesasSub;

  if (kpiLucroValor) kpiLucroValor.textContent = ind.lucroLiquido;
  if (kpiLucroSub) kpiLucroSub.textContent = ind.lucroSub;
  if (kpiLucroBox) {
    const isNeg = ehValorNegativo(ind.lucroLiquido);
    kpiLucroBox.className = `kpi-bento-item ${
      isNeg ? "kpi-status-negative" : "kpi-status-positive"
    }`;
  }

  if (kpiMargemValor) kpiMargemValor.textContent = ind.margemOperacional;
  if (kpiMargemSub) kpiMargemSub.textContent = ind.margemSub;
  if (kpiMargemBox) {
    const isNegMargem = ehValorNegativo(ind.margemOperacional);
    kpiMargemBox.className = `kpi-bento-item ${
      isNegMargem ? "kpi-status-negative" : "kpi-status-positive"
    }`;
  }

  // Detalhamento de Saídas
  const finInsumosDiretos = document.getElementById("finInsumosDiretos");
  const finGastosEsporadicos = document.getElementById("finGastosEsporadicos");
  const finTotalSaidas = document.getElementById("finTotalSaidas");

  if (finInsumosDiretos) finInsumosDiretos.textContent = saidas.insumosDiretos;
  if (finGastosEsporadicos) finGastosEsporadicos.textContent = saidas.gastosEsporadicos;
  if (finTotalSaidas) finTotalSaidas.textContent = saidas.totalSaidas;

  // 3. Divisão de Gastos, Lucros e Acerto de Contas (50% João / 50% Natan)
  const partnerDivisionList = document.getElementById("partnerDivisionList");
  if (partnerDivisionList) {
    partnerDivisionList.innerHTML = div
      .map((item) => {
        const lower = String(item.metrica || "").toLowerCase();
        const isLucroOuSaldo =
          lower.includes("lucro líquido") || lower.includes("saldo líquido");
        const extraCardClass = lower.includes("saldo líquido")
          ? "highlight-settlement"
          : "";

        return `
          <div class="partner-metric-card ${extraCardClass}">
            <div class="partner-metric-top">
              <div>
                <div class="partner-metric-title">${item.metrica}</div>
                <div class="partner-metric-obs">${item.observacao || ""}</div>
              </div>
              <span class="partner-rule-pill">${item.regra || "50% / 50%"}</span>
            </div>
            <div class="partner-values-grid">
              <div class="partner-val-col">
                <span>João</span>
                <strong class="${classeCorValor(item.joao, isLucroOuSaldo)}">${item.joao}</strong>
              </div>
              <div class="partner-val-col">
                <span>Natan</span>
                <strong class="${classeCorValor(item.natan, isLucroOuSaldo)}">${item.natan}</strong>
              </div>
              <div class="partner-val-col">
                <span>Total</span>
                <strong class="${classeCorValor(item.total, isLucroOuSaldo)}">${item.total}</strong>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // 4. Ficha Técnica & Custo Unitário por Palha
  const ftCustoUnitarioTotal = document.getElementById("ftCustoUnitarioTotal");
  const ftPrecoMedioVenda = document.getElementById("ftPrecoMedioVenda");
  const ftLucroBrutoUnitario = document.getElementById("ftLucroBrutoUnitario");
  const ftMargemBrutaPct = document.getElementById("ftMargemBrutaPct");
  const costCompositionBar = document.getElementById("costCompositionBar");
  const techSheetItemsList = document.getElementById("techSheetItemsList");

  if (ftCustoUnitarioTotal) ftCustoUnitarioTotal.textContent = ft.custoTotalUnitario;
  if (ftPrecoMedioVenda) ftPrecoMedioVenda.textContent = ft.precoMedioVenda;
  if (ftLucroBrutoUnitario) ftLucroBrutoUnitario.textContent = ft.lucroBrutoUnitario;
  if (ftMargemBrutaPct) ftMargemBrutaPct.textContent = `Margem ${ft.margemBrutaUnitaria}`;

  const coresGrafico = ["#5A200D", "#D4A373", "#943E21", "#C08552"];
  const itensFicha = Array.isArray(ft.itens) ? ft.itens : DADOS_FINANCEIROS_PADRAO.fichaTecnica.itens;

  if (costCompositionBar) {
    costCompositionBar.innerHTML = itensFicha
      .map((item, idx) => {
        const pctNum =
          parseFloat(String(item.percentual).replace("%", "").replace(",", ".")) || 0;
        const cor = coresGrafico[idx % coresGrafico.length];
        return `<div class="cost-bar-segment" style="width: ${pctNum}%; background-color: ${cor};" title="${item.componente}: ${item.percentual}"></div>`;
      })
      .join("");
  }

  if (techSheetItemsList) {
    techSheetItemsList.innerHTML = itensFicha
      .map((item, idx) => {
        const cor = coresGrafico[idx % coresGrafico.length];
        return `
          <div class="tech-item-card">
            <div class="tech-item-top">
              <div class="tech-item-title-wrap">
                <span class="tech-color-dot" style="background-color: ${cor};"></span>
                <div>
                  <div class="tech-item-name">${item.componente}</div>
                  <div class="tech-item-desc">${item.detalhamento}</div>
                </div>
              </div>
              <div class="tech-item-unit-badge">
                <span class="tech-item-unit-cost">${item.custoUnitario} / un.</span>
                <span class="tech-item-pct">${item.percentual} do custo</span>
              </div>
            </div>
            <div class="tech-item-meta">
              <span>Custo Base: <strong>${item.custoBase}</strong></span>
              <span>Rendimento: <strong>${item.rendimento} unid.</strong></span>
            </div>
          </div>
        `;
      })
      .join("");
  }
}

let carregandoGestao = false;

function carregarDadosGestao(exibirToast = true) {
  if (carregandoGestao) return;
  carregandoGestao = true;

  if (refreshFinanceBtn) refreshFinanceBtn.classList.add("loading");
  if (syncBtnLabel) syncBtnLabel.textContent = "Sincronizando...";
  if (financeSyncDot) financeSyncDot.classList.add("syncing");
  if (financeLastSyncText) {
    financeLastSyncText.textContent = 'Lendo aba "Visão Geral" da planilha...';
  }

  fetch(`${urlPlanilha}?acao=gestao&t=${Date.now()}`)
    .then(async (res) => {
      const texto = await res.text();
      return JSON.parse(texto);
    })
    .then((data) => {
      const payloadGestao = data && data.gestao ? data.gestao : data;
      if (data && data.despesas) {
        renderizarPainelDespesas(data.despesas);
      }
      if (payloadGestao && (payloadGestao.indicadores || payloadGestao.fichaTecnica)) {
        renderizarPainelGestao(payloadGestao);
        const hora = new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        });
        if (financeLastSyncText) {
          financeLastSyncText.textContent = `Sincronizado com "Visão Geral" às ${hora}`;
        }
        if (exibirToast) {
          mostrarNotificacao("Planilha sincronizada com sucesso!", "success");
        }
      } else {
        throw new Error("A planilha ainda não retornou os dados da aba Visão Geral.");
      }
    })
    .catch((err) => {
      console.warn("Usando snapshot local da Visão Geral:", err.message);
      if (financeLastSyncText) {
        financeLastSyncText.textContent =
          'Exibindo dados da "Visão Geral" (atualize o Apps Script para sincronia ao vivo)';
      }
      if (exibirToast) {
        mostrarNotificacao(
          "Atualize o código no Apps Script (Nova versão) para sincronizar ao vivo",
          "error"
        );
      }
    })
    .finally(() => {
      carregandoGestao = false;
      if (refreshFinanceBtn) refreshFinanceBtn.classList.remove("loading");
      if (syncBtnLabel) syncBtnLabel.textContent = "Atualizar";
      if (financeSyncDot) financeSyncDot.classList.remove("syncing");
      const refreshExpensesBtnEl = document.getElementById("refreshExpensesBtn");
      const syncExpensesBtnLabelEl = document.getElementById("syncExpensesBtnLabel");
      if (refreshExpensesBtnEl) refreshExpensesBtnEl.classList.remove("loading");
      if (syncExpensesBtnLabelEl) syncExpensesBtnLabelEl.textContent = "Atualizar";
    });
}

if (refreshFinanceBtn) {
  refreshFinanceBtn.addEventListener("click", () => carregarDadosGestao(true));
}

// ============================================================================
// ABA 3: CONTROLE DE INSUMOS E DESPESAS (ABA "INSUMOS E DESPESAS")
// ============================================================================
const SUGESTOES_POR_CATEGORIA = {
  "Ingredientes": [
    { rotulo: "Leite Cond. (27 un)", texto: "Leite Condensado (Caixa c/ 27 un)", qtd: 27, valor: 135.00, obs: "Comprado no Atacadão" },
    { rotulo: "Maisena (400g)", texto: "Biscoito Maisena (Pacote 400g)", qtd: 4, valor: 28.00, obs: "Supermercado local" },
    { rotulo: "Cacau 50% (1kg)", texto: "Chocolate em Pó 50% (1kg)", qtd: 1, valor: 38.50, obs: "Loja de confeitaria" },
    { rotulo: "Manteiga (500g)", texto: "Manteiga sem sal (500g)", qtd: 2, valor: 32.00, obs: "Para a base de brigadeiro" },
    { rotulo: "Leite Ninho", texto: "Leite Ninho em Pó (Lata 380g)", qtd: 1, valor: 22.00, obs: "Supermercado local" }
  ],
  "Embalagens": [
    { rotulo: "Celofane (100 un)", texto: "Saquinhos Celofane (Pacote c/ 100)", qtd: 100, valor: 18.00, obs: "Embalagem individual" },
    { rotulo: "Fitilho / Fita", texto: "Rolo de Fitilho / Fita Cetim", qtd: 1, valor: 12.00, obs: "Loja de confeitaria" },
    { rotulo: "Forminhas (100 un)", texto: "Forminhas / Tapetinhos para doce", qtd: 100, valor: 9.50, obs: "Loja de embalagens" }
  ],
  "Adesivos": [
    { rotulo: "Adesivos Logo (100 un)", texto: "Adesivos com Logo da Marca (100 un)", qtd: 100, valor: 25.00, obs: "Gráfica rápida" },
    { rotulo: "Tag La Dolce (100 un)", texto: "Tag Personalizada La Dolce (100 un)", qtd: 100, valor: 30.00, obs: "Gráfica rápida" }
  ],
  "Alimentação/Água": [
    { rotulo: "Marmita + Água", texto: "Marmita almoço + Água mineral", qtd: 2, valor: 42.00, obs: "Almoço durante produção/vendas" },
    { rotulo: "Água mineral", texto: "Água mineral para turno de vendas", qtd: 2, valor: 8.00, obs: "Durante vendas na rua" },
    { rotulo: "Lanche rápido", texto: "Lanche rápido da equipe", qtd: 2, valor: 24.00, obs: "Turno de vendas" }
  ],
  "Transporte": [
    { rotulo: "Combustível", texto: "Combustível / Deslocamento entregas", qtd: 1, valor: 20.00, obs: "Entrega nos pontos parceiros" },
    { rotulo: "Uber / 99", texto: "Uber / 99 para busca de insumos", qtd: 1, valor: 18.00, obs: "Ida ao atacado" },
    { rotulo: "Estacionamento", texto: "Estacionamento / Pedágio", qtd: 1, valor: 10.00, obs: "Rota de entregas" }
  ],
  "Outros": [
    { rotulo: "Gás / Energia", texto: "Proporcional Gás de Cozinha / Energia", qtd: 1, valor: 15.00, obs: "Custo indireto de produção" },
    { rotulo: "Utensílio cozinha", texto: "Espátula de Silicone / Panela", qtd: 1, valor: 35.00, obs: "Utensílio de cozinha" },
    { rotulo: "Luvas / Toucas", texto: "Touca descartável / Luvas / Álcool", qtd: 1, valor: 16.00, obs: "Higiene na produção" }
  ]
};

// Dados iniciais espelhados exatamente da aba "Insumos e Despesas" da planilha
const DADOS_DESPESAS_PADRAO = {
  itens: [
    {
      linha: 2,
      data: "01/11/2026",
      categoria: "Ingredientes",
      descricao: "Leite Condensado (Caixa c/ 27 un)",
      quantidade: 27,
      valorTotal: "R$ 135,00",
      valorNumerico: 135.00,
      pagoPor: "João",
      tipoGasto: "Insumo Direto",
      observacoes: "Comprado no Atacadão"
    },
    {
      linha: 3,
      data: "01/11/2026",
      categoria: "Ingredientes",
      descricao: "Biscoito Maisena (Pacote 400g)",
      quantidade: 4,
      valorTotal: "R$ 28,00",
      valorNumerico: 28.00,
      pagoPor: "Natan",
      tipoGasto: "Insumo Direto",
      observacoes: "Supermercado local"
    },
    {
      linha: 4,
      data: "02/11/2026",
      categoria: "Ingredientes",
      descricao: "Chocolate em Pó 50% (1kg)",
      quantidade: 1,
      valorTotal: "R$ 38,50",
      valorNumerico: 38.50,
      pagoPor: "João",
      tipoGasto: "Insumo Direto",
      observacoes: "Loja de confeitaria"
    },
    {
      linha: 5,
      data: "02/11/2026",
      categoria: "Ingredientes",
      descricao: "Manteiga sem sal (500g)",
      quantidade: 2,
      valorTotal: "R$ 32,00",
      valorNumerico: 32.00,
      pagoPor: "Natan",
      tipoGasto: "Insumo Direto",
      observacoes: "Para a base de brigadeiro"
    },
    {
      linha: 6,
      data: "02/11/2026",
      categoria: "Embalagens",
      descricao: "Saquinhos Celofane (Pacote c/ 100)",
      quantidade: 100,
      valorTotal: "R$ 18,00",
      valorNumerico: 18.00,
      pagoPor: "João",
      tipoGasto: "Insumo Direto",
      observacoes: "Embalagem individual"
    },
    {
      linha: 7,
      data: "02/11/2026",
      categoria: "Adesivos",
      descricao: "Adesivos com Logo da Marca (100 un)",
      quantidade: 100,
      valorTotal: "R$ 25,00",
      valorNumerico: 25.00,
      pagoPor: "Natan",
      tipoGasto: "Insumo Direto",
      observacoes: "Gráfica rápida"
    },
    {
      linha: 8,
      data: "03/11/2026",
      categoria: "Alimentação/Água",
      descricao: "Marmita almoço + Água mineral",
      quantidade: 2,
      valorTotal: "R$ 42,00",
      valorNumerico: 42.00,
      pagoPor: "João",
      tipoGasto: "Gasto Esporádico",
      observacoes: "Almoço durante produção/vendas"
    },
    {
      linha: 9,
      data: "03/11/2026",
      categoria: "Transporte",
      descricao: "Combustível / Deslocamento entregas",
      quantidade: 1,
      valorTotal: "R$ 20,00",
      valorNumerico: 20.00,
      pagoPor: "Natan",
      tipoGasto: "Gasto Esporádico",
      observacoes: "Entrega nos pontos parceiros"
    }
  ],
  resumo: {
    totalGeral: 338.50,
    insumosDiretos: 276.50,
    gastosEsporadicos: 62.00,
    pagoJoao: 233.50,
    pagoNatan: 105.00,
    quantidadeLancamentos: 8
  }
};

const expenseState = {
  categoria: "Ingredientes",
  descricao: "",
  quantidade: 1,
  valorTotal: 0,
  pagoPor: "Natan",
  tipoGasto: "Insumo Direto",
  observacoes: "",
  filtroHistorico: "todos",
  enviando: false,
  dadosAtuais: JSON.parse(JSON.stringify(DADOS_DESPESAS_PADRAO))
};

// Elementos da Aba de Despesas
const refreshExpensesBtn = document.getElementById("refreshExpensesBtn");
const syncExpensesBtnLabel = document.getElementById("syncExpensesBtnLabel");
const segBtnNewExpense = document.getElementById("segBtnNewExpense");
const segBtnHistoryExpense = document.getElementById("segBtnHistoryExpense");
const segHistoryCount = document.getElementById("segHistoryCount");
const expenseFormView = document.getElementById("expenseFormView");
const expenseHistoryView = document.getElementById("expenseHistoryView");

const expenseForm = document.getElementById("expenseForm");
const expCategoryCards = document.querySelectorAll(".exp-cat-card");
const expCategoryAutoHint = document.getElementById("expCategoryAutoHint");
const expDescInput = document.getElementById("expDescInput");
const expQuickItemChips = document.getElementById("expQuickItemChips");
const expTotalValueInput = document.getElementById("expTotalValueInput");
const expValChips = document.querySelectorAll(".exp-val-chip");
const expQtyMinusBtn = document.getElementById("expQtyMinusBtn");
const expQtyPlusBtn = document.getElementById("expQtyPlusBtn");
const expQtyInput = document.getElementById("expQtyInput");
const expQtyChips = document.querySelectorAll(".exp-qty-chip");
const expCalculatedUnitCost = document.getElementById("expCalculatedUnitCost");
const payerOptionBtns = document.querySelectorAll(".payer-option-btn");
const expTypeCards = document.querySelectorAll(".exp-type-card");
const expObsInput = document.getElementById("expObsInput");
const expObsChips = document.querySelectorAll(".exp-obs-chip");

const expSummaryCatType = document.getElementById("expSummaryCatType");
const expSummaryItem = document.getElementById("expSummaryItem");
const expSummaryPayer = document.getElementById("expSummaryPayer");
const expSummaryReimbursement = document.getElementById("expSummaryReimbursement");
const expSummaryQtyLabel = document.getElementById("expSummaryQtyLabel");
const expSummaryTotalVal = document.getElementById("expSummaryTotalVal");
const submitExpenseBtn = document.getElementById("submitExpenseBtn");

const expFilterPills = document.querySelectorAll(".exp-filter-pill");
const expensesHistoryList = document.getElementById("expensesHistoryList");

function alternarSubViewDespesas(modo) {
  const isNovo = modo === "novo";
  if (segBtnNewExpense) {
    segBtnNewExpense.classList.toggle("active", isNovo);
    segBtnNewExpense.setAttribute("aria-selected", String(isNovo));
  }
  if (segBtnHistoryExpense) {
    segBtnHistoryExpense.classList.toggle("active", !isNovo);
    segBtnHistoryExpense.setAttribute("aria-selected", String(!isNovo));
  }
  if (expenseFormView) expenseFormView.classList.toggle("hidden", !isNovo);
  if (expenseHistoryView) expenseHistoryView.classList.toggle("hidden", isNovo);
}

if (segBtnNewExpense) {
  segBtnNewExpense.addEventListener("click", () => alternarSubViewDespesas("novo"));
}
if (segBtnHistoryExpense) {
  segBtnHistoryExpense.addEventListener("click", () => alternarSubViewDespesas("historico"));
}

if (refreshExpensesBtn) {
  refreshExpensesBtn.addEventListener("click", () => {
    refreshExpensesBtn.classList.add("loading");
    if (syncExpensesBtnLabel) syncExpensesBtnLabel.textContent = "Sincronizando...";
    carregarDadosGestao(true);
  });
}

function selecionarTipoGasto(tipo) {
  expenseState.tipoGasto = tipo;
  expTypeCards.forEach((card) => {
    card.classList.toggle("selected", card.dataset.exptype === tipo);
  });
  if (expCategoryAutoHint) {
    expCategoryAutoHint.textContent = tipo;
    expCategoryAutoHint.classList.toggle("sporadic", tipo === "Gasto Esporádico");
  }
  atualizarResumoDespesa();
}

function selecionarPagadorDespesa(pagador) {
  expenseState.pagoPor = pagador;
  payerOptionBtns.forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.payer === pagador);
  });
  atualizarResumoDespesa();
}

function renderizarSugestoesCategoria(categoria) {
  if (!expQuickItemChips) return;
  const lista = SUGESTOES_POR_CATEGORIA[categoria] || [];
  expQuickItemChips.innerHTML = lista
    .map(
      (sug, i) => `
      <button type="button" class="tag-chip exp-sug-chip" data-idx="${i}">
        ${sug.rotulo || sug.texto}
      </button>
    `
    )
    .join("");

  expQuickItemChips.querySelectorAll(".exp-sug-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sug = lista[Number(btn.dataset.idx)];
      if (!sug) return;

      expenseState.descricao = sug.texto;
      if (expDescInput) expDescInput.value = sug.texto;

      definirQuantidadeDespesa(sug.qtd || 1);

      if (sug.valor) {
        expenseState.valorTotal = sug.valor;
        if (expTotalValueInput) expTotalValueInput.value = sug.valor.toFixed(2);
        expValChips.forEach((c) => {
          c.classList.toggle("active", parseFloat(c.dataset.val) === sug.valor);
        });
      }

      if (sug.obs && expObsInput) {
        expenseState.observacoes = sug.obs;
        expObsInput.value = sug.obs;
      }

      expQuickItemChips.querySelectorAll(".exp-sug-chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      atualizarResumoDespesa();
    });
  });
}

expCategoryCards.forEach((card) => {
  card.addEventListener("click", () => {
    expCategoryCards.forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");

    const cat = card.dataset.category;
    const defaultType = card.dataset.defaultType || "Insumo Direto";
    expenseState.categoria = cat;

    selecionarTipoGasto(defaultType);
    renderizarSugestoesCategoria(cat);
    atualizarResumoDespesa();
  });
});

if (expDescInput) {
  expDescInput.addEventListener("input", () => {
    expenseState.descricao = expDescInput.value.trim();
    atualizarResumoDespesa();
  });
}

function definirQuantidadeDespesa(novaQtd) {
  const qtd = Math.max(1, Math.min(9999, parseInt(novaQtd, 10) || 1));
  expenseState.quantidade = qtd;
  if (expQtyInput) expQtyInput.value = qtd;

  expQtyChips.forEach((chip) => {
    chip.classList.toggle("active", parseInt(chip.dataset.qty, 10) === qtd);
  });

  atualizarResumoDespesa();
}

if (expQtyMinusBtn) {
  expQtyMinusBtn.addEventListener("click", () => definirQuantidadeDespesa(expenseState.quantidade - 1));
}
if (expQtyPlusBtn) {
  expQtyPlusBtn.addEventListener("click", () => definirQuantidadeDespesa(expenseState.quantidade + 1));
}
if (expQtyInput) {
  expQtyInput.addEventListener("input", () => {
    const val = parseInt(expQtyInput.value, 10);
    if (val > 0) {
      expenseState.quantidade = val;
      expQtyChips.forEach((chip) => {
        chip.classList.toggle("active", parseInt(chip.dataset.qty, 10) === val);
      });
      atualizarResumoDespesa();
    }
  });
}

expQtyChips.forEach((chip) => {
  chip.addEventListener("click", () => definirQuantidadeDespesa(parseInt(chip.dataset.qty, 10)));
});

if (expTotalValueInput) {
  expTotalValueInput.addEventListener("input", () => {
    const val = parseFloat(expTotalValueInput.value);
    expenseState.valorTotal = isNaN(val) || val < 0 ? 0 : val;
    expValChips.forEach((c) => {
      c.classList.toggle("active", parseFloat(c.dataset.val) === expenseState.valorTotal);
    });
    atualizarResumoDespesa();
  });
}

expValChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const val = parseFloat(chip.dataset.val);
    expenseState.valorTotal = val;
    if (expTotalValueInput) expTotalValueInput.value = val.toFixed(2);
    expValChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    atualizarResumoDespesa();
  });
});

payerOptionBtns.forEach((btn) => {
  btn.addEventListener("click", () => selecionarPagadorDespesa(btn.dataset.payer));
});

expTypeCards.forEach((card) => {
  card.addEventListener("click", () => selecionarTipoGasto(card.dataset.exptype));
});

if (expObsInput) {
  expObsInput.addEventListener("input", () => {
    expenseState.observacoes = expObsInput.value;
  });
}

expObsChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    expenseState.observacoes = chip.dataset.obs;
    if (expObsInput) expObsInput.value = chip.dataset.obs;
    expObsChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
  });
});

function atualizarResumoDespesa() {
  const qtd = Math.max(1, expenseState.quantidade);
  const total = Math.max(0, expenseState.valorTotal);
  const unitario = total / qtd;
  const metadeCredito = total / 2;

  if (expCalculatedUnitCost) {
    expCalculatedUnitCost.textContent = `${formatarMoeda(unitario)} / un.`;
  }
  if (expSummaryCatType) {
    expSummaryCatType.textContent = `${expenseState.categoria} • ${expenseState.tipoGasto}`;
  }
  if (expSummaryItem) {
    expSummaryItem.textContent = expenseState.descricao || "—";
  }
  if (expSummaryPayer) {
    expSummaryPayer.textContent = expenseState.pagoPor;
  }
  if (expSummaryReimbursement) {
    expSummaryReimbursement.textContent = `+${formatarMoeda(metadeCredito)} (${expenseState.pagoPor})`;
  }
  if (expSummaryQtyLabel) {
    expSummaryQtyLabel.textContent = `Total (${qtd} un.)`;
  }
  if (expSummaryTotalVal) {
    expSummaryTotalVal.textContent = formatarMoeda(total);
  }
}

function renderizarPainelDespesas(dadosDespesas) {
  if (!dadosDespesas || !Array.isArray(dadosDespesas.itens)) return;

  expenseState.dadosAtuais = dadosDespesas;
  const itens = dadosDespesas.itens;
  const res = dadosDespesas.resumo || {
    totalGeral: 0,
    insumosDiretos: 0,
    gastosEsporadicos: 0,
    pagoJoao: 0,
    pagoNatan: 0,
    quantidadeLancamentos: itens.length
  };

  const expTotalGeralVal = document.getElementById("expTotalGeralVal");
  const expCountBadge = document.getElementById("expCountBadge");
  const expTotalInsumosVal = document.getElementById("expTotalInsumosVal");
  const expTotalEsporadicosVal = document.getElementById("expTotalEsporadicosVal");
  const expPagoJoaoVal = document.getElementById("expPagoJoaoVal");
  const expPagoNatanVal = document.getElementById("expPagoNatanVal");

  if (expTotalGeralVal) expTotalGeralVal.textContent = formatarMoeda(res.totalGeral);
  if (expCountBadge) {
    const n = res.quantidadeLancamentos || itens.length;
    expCountBadge.textContent = `${n} ${n === 1 ? "lançamento" : "lançamentos"}`;
  }
  if (segHistoryCount) {
    segHistoryCount.textContent = String(res.quantidadeLancamentos || itens.length);
  }
  if (expTotalInsumosVal) expTotalInsumosVal.textContent = formatarMoeda(res.insumosDiretos);
  if (expTotalEsporadicosVal) expTotalEsporadicosVal.textContent = formatarMoeda(res.gastosEsporadicos);
  if (expPagoJoaoVal) expPagoJoaoVal.textContent = formatarMoeda(res.pagoJoao);
  if (expPagoNatanVal) expPagoNatanVal.textContent = formatarMoeda(res.pagoNatan);

  renderizarListaHistoricoDespesas();
}

function renderizarListaHistoricoDespesas() {
  if (!expensesHistoryList) return;
  const todosItens = (expenseState.dadosAtuais && expenseState.dadosAtuais.itens) || [];
  const filtro = expenseState.filtroHistorico;

  const filtrados = todosItens
    .slice()
    .reverse()
    .filter((item) => {
      if (filtro === "todos") return true;
      if (filtro === "Insumo Direto" || filtro === "Gasto Esporádico") {
        return String(item.tipoGasto).toLowerCase() === filtro.toLowerCase();
      }
      return String(item.pagoPor).toLowerCase() === filtro.toLowerCase();
    });

  if (filtrados.length === 0) {
    expensesHistoryList.innerHTML = `
      <div style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.84rem;">
        Nenhuma despesa encontrada para este filtro.
      </div>
    `;
    return;
  }

  expensesHistoryList.innerHTML = filtrados
    .map((item) => {
      const isSporadic = String(item.tipoGasto).toLowerCase().includes("espor");
      const valorExibido =
        item.valorTotal && String(item.valorTotal).includes("R$")
          ? item.valorTotal
          : formatarMoeda(item.valorNumerico || 0);

      return `
        <div class="expense-history-item">
          <div class="expense-history-top">
            <div class="expense-history-title">${item.descricao}</div>
            <div class="expense-history-val">${valorExibido}</div>
          </div>
          <div class="expense-history-badges">
            <span class="exp-badge">${item.categoria}</span>
            <span class="exp-badge ${isSporadic ? "sporadic" : "direct"}">${item.tipoGasto}</span>
            <span class="exp-badge payer">Pago por ${item.pagoPor}</span>
            <span class="exp-badge">Qtd: ${item.quantidade}</span>
          </div>
          <div class="expense-history-footer">
            <span>📅 ${item.data}</span>
            <span>${item.observacoes ? `📍 ${item.observacoes}` : `Linha ${item.linha || "—"}`}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

expFilterPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    expFilterPills.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    expenseState.filtroHistorico = pill.dataset.filter;
    renderizarListaHistoricoDespesas();
  });
});

// Envio do Formulário de Nova Despesa para a Planilha ("Insumos e Despesas")
if (expenseForm) {
  expenseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (expenseState.enviando) return;

    if (!appState.vendedorLogado) {
      mostrarNotificacao("Faça login com sua senha primeiro!", "error");
      alternarAba("tabLogin");
      return;
    }

    const descricao = (expDescInput ? expDescInput.value : expenseState.descricao).trim();
    if (!descricao) {
      mostrarNotificacao("Informe o que foi comprado (Item / Descrição)", "error");
      if (expDescInput) expDescInput.focus();
      return;
    }

    const valorTotal = parseFloat(expTotalValueInput ? expTotalValueInput.value : expenseState.valorTotal);
    if (isNaN(valorTotal) || valorTotal <= 0) {
      mostrarNotificacao("Informe o valor total pago na compra", "error");
      if (expTotalValueInput) expTotalValueInput.focus();
      return;
    }

    const quantidade = Math.max(1, parseInt(expQtyInput ? expQtyInput.value : expenseState.quantidade, 10) || 1);
    const observacoes = (expObsInput ? expObsInput.value : expenseState.observacoes).trim();

    const payloadDespesa = {
      acao: "registrarDespesa",
      tipoRegistro: "despesa",
      categoria: expenseState.categoria,
      descricao: descricao,
      quantidade: quantidade,
      valorTotal: Number(valorTotal.toFixed(2)),
      pagoPor: expenseState.pagoPor,
      tipoGasto: expenseState.tipoGasto,
      observacoes: observacoes
    };

    expenseState.enviando = true;
    submitExpenseBtn.disabled = true;
    const btnOriginal = submitExpenseBtn.innerHTML;
    submitExpenseBtn.innerHTML = `<div class="spinner"></div><span>Salvando na aba Insumos e Despesas...</span>`;

    fetch(urlPlanilha, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payloadDespesa)
    })
      .then(async (response) => {
        const texto = await response.text();
        let data;
        try {
          data = JSON.parse(texto);
        } catch {
          throw new Error(
            "O Google Apps Script não retornou JSON válido. Atualize o código no Apps Script com a nova função registrarNovaDespesa."
          );
        }
        if (data.status && data.status !== "sucesso" && data.status !== "ok") {
          throw new Error(data.mensagem || "Erro ao salvar despesa na planilha.");
        }
        return data;
      })
      .then((data) => {
        const localStr = data && data.aba && data.linha ? ` (${data.aba}, linha ${data.linha})` : "";
        mostrarNotificacao(
          `Despesa de ${formatarMoeda(valorTotal)} registrada${localStr}!`,
          "success"
        );

        // Se o backend retornou a lista atualizada de despesas e gestão, usa direto
        if (data && data.despesas) {
          renderizarPainelDespesas(data.despesas);
        } else {
          // Atualização otimista local caso o script antigo ainda esteja publicado
          const hoje = new Date().toLocaleDateString("pt-BR");
          expenseState.dadosAtuais.itens.push({
            linha: expenseState.dadosAtuais.itens.length + 2,
            data: hoje,
            categoria: payloadDespesa.categoria,
            descricao: payloadDespesa.descricao,
            quantidade: payloadDespesa.quantidade,
            valorTotal: formatarMoeda(payloadDespesa.valorTotal),
            valorNumerico: payloadDespesa.valorTotal,
            pagoPor: payloadDespesa.pagoPor,
            tipoGasto: payloadDespesa.tipoGasto,
            observacoes: payloadDespesa.observacoes
          });
          expenseState.dadosAtuais.resumo.totalGeral += payloadDespesa.valorTotal;
          expenseState.dadosAtuais.resumo.quantidadeLancamentos += 1;
          if (payloadDespesa.tipoGasto === "Gasto Esporádico") {
            expenseState.dadosAtuais.resumo.gastosEsporadicos += payloadDespesa.valorTotal;
          } else {
            expenseState.dadosAtuais.resumo.insumosDiretos += payloadDespesa.valorTotal;
          }
          if (payloadDespesa.pagoPor === "João") {
            expenseState.dadosAtuais.resumo.pagoJoao += payloadDespesa.valorTotal;
          } else {
            expenseState.dadosAtuais.resumo.pagoNatan += payloadDespesa.valorTotal;
          }
          renderizarPainelDespesas(expenseState.dadosAtuais);
        }

        if (data && data.gestao) {
          renderizarPainelGestao(data.gestao);
        } else {
          carregarDadosGestao(false);
        }

        // Limpa os campos para o próximo lançamento mantendo categoria e pagador
        expenseState.descricao = "";
        expenseState.valorTotal = 0;
        expenseState.observacoes = "";
        if (expDescInput) expDescInput.value = "";
        if (expTotalValueInput) expTotalValueInput.value = "";
        if (expObsInput) expObsInput.value = "";
        expValChips.forEach((c) => c.classList.remove("active"));
        expObsChips.forEach((c) => c.classList.remove("active"));
        definirQuantidadeDespesa(1);
        renderizarSugestoesCategoria(expenseState.categoria);
      })
      .catch((error) => {
        console.error("Erro ao registrar despesa:", error);
        mostrarNotificacao(
          error.message || "Erro ao conectar com a planilha. Verifique o Apps Script.",
          "error"
        );
      })
      .finally(() => {
        expenseState.enviando = false;
        submitExpenseBtn.disabled = false;
        submitExpenseBtn.innerHTML = btnOriginal;
      });
  });
}

// Inicialização
atualizarInterfaceVendedor();
atualizarResumoVenda();
renderizarSugestoesCategoria(expenseState.categoria);
atualizarResumoDespesa();
renderizarPainelDespesas(DADOS_DESPESAS_PADRAO);
renderizarPainelGestao(DADOS_FINANCEIROS_PADRAO);