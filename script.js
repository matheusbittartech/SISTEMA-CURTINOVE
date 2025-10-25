/* ========= SUPABASE ========= */
const { createClient } = supabase;
const supabaseClient = createClient(
  'https://pvdrnwnjodopzyeeqpps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2ZHJud25qb2RvcHp5ZWVxcHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1MTE2NzksImV4cCI6MjA2ODA4NzY3OX0.u4I04eqZI3K5sbzIrzICWIQVaRkQfk5DE_jyr_Omw9Y'
);

/* ========= HELPERS ========= */
const fmtBR = (n)=> Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function getDataLocalYYYYMMDD(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function formatDateBR(x){ if(!x) return '—'; const d=new Date(x); return isNaN(d)?'—':d.toLocaleDateString('pt-BR'); }
function debounce(fn,t=300){ let id; return (...a)=>{ clearTimeout(id); id=setTimeout(()=>fn(...a),t); }; }
function toast(msg, kind='success'){ const t=document.createElement('div'); t.className=`toast ${kind}`; t.textContent=msg; document.getElementById('toaster').appendChild(t); setTimeout(()=>t.remove(),2200); }

/* ========= NAV ========= */
function mostrarTela(id){
  document.querySelectorAll('section').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id==='cadastro') buscarClientes();
  if (id==='consultas') { initFiltrosVendas().then(()=>carregarVendas(recuperarFiltros())); }
  if (id==='estoque')  buscarEstoque();
  if (id==='relatorios') {
    carregarRelatorios();
    iniciarAtualizacaoAutomatica();
  } else {
    pararAtualizacaoAutomatica();
  }
}

/* ========= CLIENTES ========= */
let CLIENTES_STATE={todos:[], filtrados:[], pagina:1, pageSize:10, busca:''};
const tbodyClientes=document.querySelector('#clientesTabela tbody');
const pagInfo=document.getElementById('paginacaoInfo');

const onBuscaRapida = debounce(()=>{ 
  CLIENTES_STATE.busca=(document.getElementById('buscaCliente').value||'').toLowerCase(); 
  filtrarClientes(); renderClientes(); 
},250);

function onChangePageSize(){ 
  CLIENTES_STATE.pageSize=parseInt(document.getElementById('pageSize').value,10); 
  CLIENTES_STATE.pagina=1; renderClientes(); 
}

async function buscarClientes(){
  document.getElementById('clientesLoading').classList.remove('hidden');
  document.getElementById('clientesEmpty').classList.add('hidden');
  const {data,error}=await supabaseClient.from('cliente').select('*').order('id',{ascending:true});
  document.getElementById('clientesLoading').classList.add('hidden');
  if(error){ toast('Erro ao buscar clientes','error'); return; }
  CLIENTES_STATE.todos=data||[]; filtrarClientes(); renderClientes();
}
function filtrarClientes(){
  const q=CLIENTES_STATE.busca;
  CLIENTES_STATE.filtrados=(CLIENTES_STATE.todos||[]).filter(c=>{
    const alvo=[c.nome,c.telefone,c.email].map(v=>(v||'').toLowerCase()).join(' ');
    return !q || alvo.includes(q);
  });
  CLIENTES_STATE.pagina=1;
}
function renderClientes(){
  const total=CLIENTES_STATE.filtrados.length;
  const totalPag=Math.max(1,Math.ceil(total/CLIENTES_STATE.pageSize));
  const ini=(CLIENTES_STATE.pagina-1)*CLIENTES_STATE.pageSize;
  const page=CLIENTES_STATE.filtrados.slice(ini,ini+CLIENTES_STATE.pageSize);

  tbodyClientes.innerHTML = page.map(c=>`
    <tr>
      <td>${c.id??''}</td>
      <td>${c.nome??''}</td>
      <td>${c.telefone??''}</td>
      <td>${c.email??''}</td>
      <td>${c.cidade??''}</td>
      <td>${c.ultima_compra?formatDateBR(c.ultima_compra):'—'}</td>
      <td>
        <button onclick="abrirEdicaoCliente(${c.id})">Editar</button>
        <button class="ghost" onclick="abrirVendaParaCliente(${c.id})">Venda</button>
        <button class="danger" onclick="excluirCliente(${c.id})">Excluir</button>
      </td>
    </tr>
  `).join('');

  document.getElementById('clientesEmpty').classList.toggle('hidden', !!page.length);
  pagInfo.textContent=`Página ${CLIENTES_STATE.pagina}/${totalPag}`;
}
function paginaAnterior(){ if(CLIENTES_STATE.pagina>1){ CLIENTES_STATE.pagina--; renderClientes(); } }
function proximaPagina(){ const totalPag=Math.max(1,Math.ceil(CLIENTES_STATE.filtrados.length/CLIENTES_STATE.pageSize)); if(CLIENTES_STATE.pagina<totalPag){ CLIENTES_STATE.pagina++; renderClientes(); } }

function abrirCadastroCliente(){ 
  document.getElementById('tituloModalCliente').innerText='Inserir Cliente'; 
  document.getElementById('clienteId').value=''; 
  limparFormCliente(); 
  document.getElementById('cadastroClienteContainer').style.display='block'; 
  setTimeout(()=>document.getElementById('nomeInput').focus(),30); 
}
async function abrirEdicaoCliente(id){
  const c=CLIENTES_STATE.todos.find(x=>x.id===id); if(!c) return;
  document.getElementById('tituloModalCliente').innerText='Editar Cliente';
  document.getElementById('clienteId').value=c.id;
  document.getElementById('nomeInput').value=c.nome||'';
  document.getElementById('telefoneInput').value=c.telefone||'';
  document.getElementById('emailInput').value=c.email||'';
  document.getElementById('cidadeInput').value=c.cidade||'';
  document.getElementById('observacoesInput').value=c.observacoes||'';
  document.getElementById('cadastroClienteContainer').style.display='block';
}
function fecharCadastroCliente(){ document.getElementById('cadastroClienteContainer').style.display='none'; }
function limparFormCliente(){ ['nomeInput','telefoneInput','emailInput','cidadeInput','observacoesInput'].forEach(id=>document.getElementById(id).value=''); }

async function salvarCliente(){
  const id=document.getElementById('clienteId').value||null;
  const nome=(document.getElementById('nomeInput').value||'').trim();
  const telefone=(document.getElementById('telefoneInput').value||'').trim();
  if(!nome || !telefone){ toast('Preencha Nome e Telefone','error'); return; }
  const payload={
    nome, telefone,
    email:(document.getElementById('emailInput').value||'').trim()||null,
    cidade:(document.getElementById('cidadeInput').value||'').trim()||null,
    observacoes:(document.getElementById('observacoesInput').value||'').trim()||null
  };
  if(id){
    const {error}=await supabaseClient.from('cliente').update(payload).eq('id',id);
    if(error){ toast('Erro ao atualizar','error'); return; }
    toast('Cliente atualizado');
  }else{
    const {error}=await supabaseClient.from('cliente').insert([payload]);
    if(error){ toast('Erro ao inserir','error'); return; }
    toast('Cliente inserido');
  }
  fecharCadastroCliente(); buscarClientes();
}
async function excluirCliente(id){
  if(!confirm('Excluir o cliente?')) return;
  const {error}=await supabaseClient.from('cliente').delete().eq('id',id);
  if(error){ toast('Erro ao excluir','error'); return; }
  toast('Cliente excluído'); buscarClientes();
}
function exportarCSV(){
  const rows=[['id','nome','telefone','email','cidade','ultima_compra']];
  CLIENTES_STATE.filtrados.forEach(c=>rows.push([c.id??'',c.nome??'',c.telefone??'',c.email??'',c.cidade??'',c.ultima_compra??'']));
  const csv=rows.map(r=>r.map(v=>`"${(v??'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`clientes_${getDataLocalYYYYMMDD()}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
function abrirVendaParaCliente(id){ 
  mostrarFormularioVenda(); 
  setTimeout(()=>{ 
    const sel=document.getElementById('clienteVendaSelect'); 
    if(sel) sel.value=id; 
  }, 400); 
}

/* ========= ESTOQUE ========= */
const onBuscaEstoque = debounce(()=>buscarEstoque(), 250);
async function buscarEstoque(){
  document.getElementById('estoqueLoading').classList.remove('hidden');
  document.getElementById('estoqueEmpty').classList.add('hidden');
  const termo=(document.getElementById('buscaProduto').value||'').toLowerCase();
  const {data,error}=await supabaseClient.from('produtos').select('*').order('nome',{ascending:true});
  document.getElementById('estoqueLoading').classList.add('hidden');
  if(error){ toast('Erro ao carregar estoque','error'); return; }
  const lista=(data||[]).filter(p=>(p.nome||'').toLowerCase().includes(termo));
  const tbody=document.querySelector('#tabelaEstoque tbody'); tbody.innerHTML='';
  lista.forEach(p=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.nome}</td><td>${fmtBR(p.preco)}</td><td>${p.estoque}</td>
      <td><button onclick='editarProduto(${JSON.stringify(p)})'>Editar</button></td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('estoqueEmpty').classList.toggle('hidden', !!lista.length);
}
function editarProduto(p){
  document.getElementById('editarProdutoContainer').style.display='block';
  document.getElementById('produtoId').value=p.id;
  document.getElementById('produtoNome').value=p.nome;
  document.getElementById('produtoPreco').value=p.preco;
  document.getElementById('produtoEstoque').value=p.estoque;
}
function fecharEditorProduto(){ document.getElementById('editarProdutoContainer').style.display='none'; }
async function salvarProdutoEditado(){
  const id=document.getElementById('produtoId').value;
  const nome=document.getElementById('produtoNome').value;
  const preco=parseFloat(document.getElementById('produtoPreco').value);
  const estoque=parseInt(document.getElementById('produtoEstoque').value);
  const {error}=await supabaseClient.from('produtos').update({nome,preco,estoque}).eq('id',id);
  if(error){ toast('Erro ao salvar produto','error'); return; }
  toast('Produto atualizado'); fecharEditorProduto(); buscarEstoque();
}

/* ========= NOVA VENDA ========= */
let listaProdutos=[], listaClientes=[], listaVendedores=[];
function mostrarFormularioVenda(){ document.getElementById('formVendaContainer').style.display='block'; carregarDadosVenda(); }
function cancelarVendaModal(){ document.getElementById('formVendaContainer').style.display='none'; document.getElementById('produtosContainer').innerHTML=''; }

async function carregarDadosVenda(){
  const [cRes,vRes,pRes]=await Promise.all([
    supabaseClient.from('cliente').select('id,nome').order('nome',{ascending:true}),
    supabaseClient.from('vendedores').select('id,nome').order('nome',{ascending:true}),
    supabaseClient.from('produtos').select('id,nome,preco').order('nome',{ascending:true})
  ]);
  if(cRes.error||vRes.error||pRes.error){ toast('Erro ao carregar dados da venda','error'); return; }
  listaClientes=cRes.data||[]; listaVendedores=vRes.data||[]; listaProdutos=pRes.data||[];

  const cSel=document.getElementById('clienteVendaSelect'); cSel.innerHTML=''; listaClientes.forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.nome; cSel.appendChild(o); });
  const vSel=document.getElementById('vendedorVendaSelect'); vSel.innerHTML=''; listaVendedores.forEach(v=>{ const o=document.createElement('option'); o.value=v.id; o.textContent=v.nome; vSel.appendChild(o); });

  document.getElementById('produtosContainer').innerHTML=''; adicionarProduto();
}
function adicionarProduto(){
  const div=document.createElement('div'); div.className='produto-linha';
  const sel=document.createElement('select'); listaProdutos.forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.nome; sel.appendChild(o); });
  const qtd=document.createElement('input'); qtd.type='number'; qtd.placeholder='Qtd'; qtd.min=1; qtd.value=1;
  const preco=document.createElement('input'); preco.type='number'; preco.placeholder='Preço Unitário'; preco.step='0.01';
  sel.addEventListener('change',()=>{ const p=listaProdutos.find(x=>x.id==sel.value); if(p) preco.value=p.preco; });
  const p0=listaProdutos.find(x=>x.id==sel.value); if(p0) preco.value=p0.preco;
  const rm=document.createElement('button'); rm.className='remover'; rm.textContent='❌'; rm.onclick=()=>div.remove();
  div.appendChild(sel); div.appendChild(qtd); div.appendChild(preco); div.appendChild(rm);
  document.getElementById('produtosContainer').appendChild(div);
}

// Salva a venda e, se não for "salvar e nova", oferece impressão do recibo
async function salvarVenda(salvarENova=false){
  try{
    const idCliente = document.getElementById('clienteVendaSelect').value;
    const idVendedor = document.getElementById('vendedorVendaSelect').value;
    if(!idCliente || !idVendedor){ toast('Selecione cliente e vendedor','error'); return; }

    // Coleta itens
    const container = document.getElementById('produtosContainer');
    const linhas = Array.from(container.querySelectorAll('.produto-linha'));
    if(!linhas.length){ toast('Adicione ao menos um produto','error'); return; }

    const itens = [];
    for(const linha of linhas){
      const sel = linha.querySelector('select');
      const qtd = Number(linha.querySelector('input[type="number"]:nth-of-type(1)')?.value || 0);
      const preco = Number(linha.querySelector('input[type="number"]:nth-of-type(2)')?.value || 0);
      if(!sel?.value || qtd<=0 || !isFinite(preco) || preco<=0){ toast('Verifique os itens da venda','error'); return; }
      itens.push({ id_produto:Number(sel.value), quantidade:qtd, preco_unitario:preco });
    }

    // Cria a venda (cabeçalho)
    const payloadVenda = { id_cliente:Number(idCliente), id_vendedor:Number(idVendedor), data_venda:getDataLocalYYYYMMDD(), status:'ativa' };
    const { data: vendaCriada, error: errVenda } = await supabaseClient
      .from('vendas')
      .insert([payloadVenda])
      .select('id')
      .single();
    if(errVenda || !vendaCriada){ toast('Erro ao salvar venda','error'); return; }

    const idVenda = vendaCriada.id;

    // Insere itens
    const itensInsert = itens.map(it=>({ ...it, id_venda:idVenda }));
    const { error: errItens } = await supabaseClient.from('itens_venda').insert(itensInsert);
    if(errItens){ toast('Erro ao salvar itens','error'); return; }

    // Atualiza última compra do cliente
    await supabaseClient.from('cliente').update({ ultima_compra:getDataLocalYYYYMMDD() }).eq('id', idCliente);

    toast('Venda salva');

    if(salvarENova){
      // Reinicia formulário para nova venda
      document.getElementById('produtosContainer').innerHTML='';
      adicionarProduto();
      // Mantém modal aberto e não imprime
    }else{
      // Fecha modal, recarrega listagem e abre recibo
      cancelarVendaModal();
      carregarVendas(recuperarFiltros());
      // Atualiza relatórios se estiver na tela de relatórios
      if (document.getElementById('relatorios').classList.contains('active')) {
        carregarRelatorios();
      }
      imprimirRecibo(idVenda);
    }
  }catch(_){
    toast('Erro inesperado ao salvar venda','error');
  }
}

/* ========= VENDAS (FILTROS + TABELA) ========= */
function salvarFiltros(f){ localStorage.setItem('filtrosVendas', JSON.stringify(f)); }
function recuperarFiltros(){ try{ return JSON.parse(localStorage.getItem('filtrosVendas')||'{}'); }catch(_){ return {}; } }

async function initFiltrosVendas(){
  const {data:produtos}=await supabaseClient.from('produtos').select('id,nome').order('nome',{ascending:true});
  const sp=document.getElementById('fProduto'); sp.innerHTML='<option value="">Todos</option>'; (produtos||[]).forEach(p=>{ const o=document.createElement('option'); o.value=p.id; o.textContent=p.nome; sp.appendChild(o); });

  const s = recuperarFiltros();
  if (s.id_produto) sp.value = s.id_produto;
  if (s.data_ini) document.getElementById('fDataIni').value = s.data_ini;
  if (s.data_fim) document.getElementById('fDataFim').value = s.data_fim;
}
function limparFiltrosVendas(){ 
  document.getElementById('fClienteNome').value=''; 
  document.getElementById('fProduto').value=''; 
  document.getElementById('fDataIni').value=''; 
  document.getElementById('fDataFim').value=''; 
  aplicarFiltrosVendas(); 
}
function aplicarFiltrosVendas(extra={}){
  const filtros={
    id_cliente: extra.id_cliente || null,
    id_produto: document.getElementById('fProduto').value || null,
    data_ini:   document.getElementById('fDataIni').value || null,
    data_fim:   document.getElementById('fDataFim').value || null,
  };
  salvarFiltros(filtros);
  carregarVendas(filtros);
}

/* 🔎 Busca cliente pelo nome em vendas */
function filtrarClienteVendas(){
  const nome=document.getElementById("fClienteNome").value.toLowerCase();
  if(!nome){ aplicarFiltrosVendas({}); return; }
  const cliente=CLIENTES_STATE.todos.find(c=>(c.nome||"").toLowerCase().includes(nome));
  if(cliente){ aplicarFiltrosVendas({id_cliente:cliente.id}); }
}

let ULTIMAS_VENDAS = []; // dataset atual para exportação

async function carregarVendas(filtros={}){
  document.getElementById('vendasLoading').classList.remove('hidden');
  document.getElementById('vendasEmpty').classList.add('hidden');

  let q=supabaseClient.from('itens_venda').select(`
    id_venda, quantidade, preco_unitario, id_produto,
    produtos:id_produto (nome),
    vendas:id_venda (
      id, data_venda, status,
      id_cliente, cliente:id_cliente (nome),
      vendedor:id_vendedor (nome)
    )
  `)
  .eq('vendas.status','ativa'); 

  if(filtros.id_cliente) q=q.eq('vendas.id_cliente', filtros.id_cliente);
  if(filtros.id_produto) q=q.eq('id_produto', filtros.id_produto);
  if(filtros.data_ini)   q=q.gte('vendas.data_venda', filtros.data_ini);
  if(filtros.data_fim)   q=q.lte('vendas.data_venda', filtros.data_fim);

  const {data, error}=await q;
  document.getElementById('vendasLoading').classList.add('hidden');
  if(error){ toast('Erro ao buscar vendas','error'); return; }

  ULTIMAS_VENDAS = data||[];

  const tbody=document.querySelector('#tabelaVendas tbody'); tbody.innerHTML='';
  let totalPeriodo=0, porVendedor={};

  (ULTIMAS_VENDAS||[]).forEach(it=>{
    const dv=it.vendas?.data_venda;
    const totalLinha=(it.quantidade||0)*(it.preco_unitario||0);

    const acoesHTML = `
      <button class="ghost" onclick="imprimirRecibo(${it.id_venda})">🧾 Recibo</button>
      <button class="danger" onclick="cancelarVenda(${it.id_venda})">Cancelar</button>
    `;

    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${it.id_venda}</td><td>${it.vendas?.cliente?.nome||'—'}</td><td>${it.vendas?.vendedor?.nome||'—'}</td>
      <td>${formatDateBR(dv)}</td><td>${it.produtos?.nome||'—'}</td><td>${it.quantidade}</td>
      <td>${fmtBR(it.preco_unitario)}</td><td>${fmtBR(totalLinha)}</td><td>${acoesHTML}</td>`;
    tbody.appendChild(tr);

    totalPeriodo+=totalLinha;
    const vend=it.vendas?.vendedor?.nome||'Não informado';
    porVendedor[vend]=(porVendedor[vend]||0)+totalLinha;
  });

  document.getElementById('vendasEmpty').classList.toggle('hidden', !!ULTIMAS_VENDAS.length);

  let melhor='—', totalMelhor=0;
  for(const [v,valor] of Object.entries(porVendedor)){ if(valor>totalMelhor){ totalMelhor=valor; melhor=v; } }

  document.getElementById('totalDia').textContent = fmtBR(totalPeriodo);
  document.getElementById('topVendedor').textContent=melhor;
  document.getElementById('totalTopVendedor').textContent=`Total: ${fmtBR(totalMelhor)}`;
}

/* ===== EXPORTAÇÃO ===== */
function toCSV(rows, filename){
  if(!rows || !rows.length){ toast('Nada para exportar','error'); return; }
  const csv = rows.map(r=>r.map(v=>`"${(v ?? '').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  toast('Relatório exportado');
}
function exportarVendasCSV(){
  if (!ULTIMAS_VENDAS.length){ toast('Carregue as vendas primeiro','error'); return; }
  const header = ['ID venda','Data','Cliente','Vendedor','Produto','Qtd','Preço unit.','Total linha'];
  const linhas = ULTIMAS_VENDAS.map(it=>{
    const totalLinha = (it.quantidade||0) * (it.preco_unitario||0);
    return [
      it.id_venda,
      it.vendas?.data_venda ?? '',
      it.vendas?.cliente?.nome ?? '',
      it.vendas?.vendedor?.nome ?? '',
      it.produtos?.nome ?? '',
      it.quantidade ?? 0,
      Number(it.preco_unitario||0).toFixed(2).replace('.',','),
      Number(totalLinha).toFixed(2).replace('.',',')
    ];
  });
  toCSV([header, ...linhas], `vendas_${getDataLocalYYYYMMDD()}.csv`);
}

/* ========= RECIBO / IMPRESSÃO ========= */
async function imprimirRecibo(idVenda){
  if(!idVenda){ toast('ID da venda inválido','error'); return; }
  // Header da venda
  const { data: venda, error: errVenda } = await supabaseClient
    .from('vendas')
    .select(`
      id, data_venda, status, id_cliente, id_vendedor,
      cliente:id_cliente (nome, telefone),
      vendedor:id_vendedor (nome)
    `)
    .eq('id', idVenda)
    .single();
  if(errVenda || !venda){ toast('Venda não encontrada','error'); return; }

  // Itens da venda
  const { data: itens, error: errItens } = await supabaseClient
    .from('itens_venda')
    .select(`
      quantidade, preco_unitario, id_produto,
      produtos:id_produto (nome)
    `)
    .eq('id_venda', idVenda);
  if(errItens){ toast('Erro ao carregar itens','error'); return; }

  const linhas = (itens||[]).map((it, idx)=>{
    const totalLinha = (Number(it.quantidade||0)) * (Number(it.preco_unitario||0));
    return `<tr>
      <td style="padding:6px 4px; text-align:center">${idx+1}</td>
      <td style="padding:6px 4px">${it.produtos?.nome||'—'}</td>
      <td style="padding:6px 4px; text-align:center">${it.quantidade||0}</td>
      <td style="padding:6px 4px; text-align:right">${fmtBR(it.preco_unitario)}</td>
      <td style="padding:6px 4px; text-align:right">${fmtBR(totalLinha)}</td>
    </tr>`;
  }).join('');

  const totalGeral = (itens||[]).reduce((acc, it)=> acc + (Number(it.quantidade||0) * Number(it.preco_unitario||0)), 0);
  const dataBR = formatDateBR(venda.data_venda);

  const html = `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Recibo #${venda.id}</title>
    <style>
      body{ font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; margin:20px; color:#111 }
      h1{ font-size:18px; margin:0 0 8px }
      .muted{ color:#666; font-size:12px }
      table{ width:100%; border-collapse:collapse; margin-top:10px }
      th,td{ border:1px solid #e5e5e5 }
      th{ background:#f6f7f8; text-align:left; padding:8px 6px }
      tfoot td{ font-weight:700 }
      .totais{ margin-top:10px; text-align:right }
      .header{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px }
      .badge{ display:inline-block; padding:2px 8px; border-radius:16px; font-size:12px; border:1px solid #ddd }
      @media print{ button{ display:none } body{ margin:0 } }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <h1>Recibo de Venda #${venda.id}</h1>
        <div class="muted">Data: ${dataBR}</div>
        <div class="muted">Status: <span class="badge">${venda.status||'—'}</span></div>
      </div>
      <div style="text-align:right">
        <div><strong>Cliente:</strong> ${venda.cliente?.nome||'—'}</div>
        <div class="muted">${venda.cliente?.telefone||''}</div>
        <div><strong>Vendedor:</strong> ${venda.vendedor?.nome||'—'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:40px; text-align:center">#</th>
          <th>Produto</th>
          <th style="width:80px; text-align:center">Qtd</th>
          <th style="width:120px; text-align:right">Preço</th>
          <th style="width:120px; text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linhas || ''}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="padding:8px 6px; text-align:right">Total geral</td>
          <td style="padding:8px 6px; text-align:right">${fmtBR(totalGeral)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="muted" style="margin-top:12px">Gerado por Sistema ERP</div>
    <button onclick="window.print()" style="margin-top:12px">Imprimir</button>
  </body>
  </html>`;

  const w = window.open('', 'PRINT', 'width=720,height=900');
  if(!w){ toast('Não foi possível abrir a janela de impressão','error'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  // Em alguns navegadores, aguardar um pequeno tempo melhora a renderização antes de imprimir
  setTimeout(()=>{ try{ w.print(); }catch(_){} }, 100);
}

/* ========= CANCELAMENTO ========= */
async function cancelarVenda(idVenda){
  if(!idVenda) return;
  if(!confirm('Cancelar a venda?')) return;
  const { error } = await supabaseClient.from('vendas').update({ status:'cancelada' }).eq('id', idVenda);
  if(error){ toast('Erro ao cancelar','error'); return; }
  toast('Venda cancelada');
  // Recarrega a lista respeitando filtros salvos
  carregarVendas(recuperarFiltros());
}

/* ========= RELATÓRIOS ========= */
let RELATORIOS_STATE = { dados: [], totalVendas: 0, quantidadeVendas: 0 };
let graficoProdutos = null;
let timerRelatorios = null;

async function carregarRelatorios(){
  document.getElementById('relatoriosLoading').classList.remove('hidden');
  document.getElementById('relatoriosEmpty').classList.add('hidden');
  
  try {
    // Busca vendas do mês atual
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    const dataIni = primeiroDiaMes.toISOString().split('T')[0];
    const dataFim = ultimoDiaMes.toISOString().split('T')[0];
    
    const { data: vendas, error } = await supabaseClient
      .from('itens_venda')
      .select(`
        quantidade, preco_unitario, id_produto,
        produtos:id_produto (nome),
        vendas:id_venda (data_venda, status)
      `)
      .gte('vendas.data_venda', dataIni)
      .lte('vendas.data_venda', dataFim)
      .eq('vendas.status', 'ativa');
    
    document.getElementById('relatoriosLoading').classList.add('hidden');
    
    if (error) {
      toast('Erro ao carregar relatórios', 'error');
      return;
    }
    
    // Processa dados
    const produtosMap = new Map();
    let totalVendas = 0;
    let quantidadeVendas = 0;
    const vendasUnicas = new Set();
    
    (vendas || []).forEach(item => {
      const produtoId = item.id_produto;
      const produtoNome = item.produtos?.nome || 'Produto não encontrado';
      const quantidade = Number(item.quantidade || 0);
      const preco = Number(item.preco_unitario || 0);
      const totalItem = quantidade * preco;
      const vendaId = item.vendas?.id;
      
      if (vendaId) vendasUnicas.add(vendaId);
      
      if (produtosMap.has(produtoId)) {
        const atual = produtosMap.get(produtoId);
        atual.quantidade += quantidade;
        atual.valorTotal += totalItem;
      } else {
        produtosMap.set(produtoId, {
          nome: produtoNome,
          quantidade: quantidade,
          valorTotal: totalItem
        });
      }
      
      totalVendas += totalItem;
    });
    
    quantidadeVendas = vendasUnicas.size;
    
    // Converte para array e ordena por valor total
    const produtosArray = Array.from(produtosMap.entries()).map(([id, dados]) => ({
      id,
      ...dados
    })).sort((a, b) => b.valorTotal - a.valorTotal);
    
    RELATORIOS_STATE = {
      dados: produtosArray,
      totalVendas,
      quantidadeVendas
    };
    
    renderRelatorios();
    atualizarKPIs();
    criarGrafico();
    
  } catch (err) {
    document.getElementById('relatoriosLoading').classList.add('hidden');
    toast('Erro ao processar relatórios', 'error');
  }
}

function renderRelatorios(){
  const tbody = document.querySelector('#tabelaRelatorios tbody');
  tbody.innerHTML = '';
  
  if (!RELATORIOS_STATE.dados.length) {
    document.getElementById('relatoriosEmpty').classList.remove('hidden');
    return;
  }
  
  document.getElementById('relatoriosEmpty').classList.add('hidden');
  
  RELATORIOS_STATE.dados.forEach((produto, index) => {
    const percentual = RELATORIOS_STATE.totalVendas > 0 
      ? ((produto.valorTotal / RELATORIOS_STATE.totalVendas) * 100).toFixed(1)
      : '0.0';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center; font-weight:bold">${index + 1}º</td>
      <td>${produto.nome}</td>
      <td style="text-align:center">${produto.quantidade}</td>
      <td style="text-align:right">${fmtBR(produto.valorTotal)}</td>
      <td style="text-align:center">${percentual}%</td>
    `;
    tbody.appendChild(tr);
  });
}

function atualizarKPIs(){
  document.getElementById('valorTotalMes').textContent = fmtBR(RELATORIOS_STATE.totalVendas);
  document.getElementById('quantidadeVendas').textContent = `${RELATORIOS_STATE.quantidadeVendas} vendas`;
  
  const agora = new Date();
  const mesAtual = agora.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  document.getElementById('periodoRelatorio').textContent = `Período: ${mesAtual}`;
}

function criarGrafico(){
  if (graficoProdutos) {
    graficoProdutos.destroy();
  }
  
  const ctx = document.getElementById('graficoProdutos').getContext('2d');
  const top10 = RELATORIOS_STATE.dados.slice(0, 10);
  
  graficoProdutos = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(p => p.nome),
      datasets: [{
        label: 'Valor Total (R$)',
        data: top10.map(p => p.valorTotal),
        backgroundColor: '#4CAF50',
        borderColor: '#3ea646',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Top 10 Produtos Mais Vendidos do Mês'
        },
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'R$ ' + value.toLocaleString('pt-BR');
            }
          }
        }
      }
    }
  });
}

function atualizarRelatorios(){
  carregarRelatorios();
  toast('Relatórios atualizados');
}

function exportarRelatorioProdutos(){
  if (!RELATORIOS_STATE.dados.length) {
    toast('Nenhum dado para exportar', 'error');
    return;
  }
  
  const header = ['Posição', 'Produto', 'Quantidade Vendida', 'Valor Total', '% do Total'];
  const linhas = RELATORIOS_STATE.dados.map((produto, index) => {
    const percentual = RELATORIOS_STATE.totalVendas > 0 
      ? ((produto.valorTotal / RELATORIOS_STATE.totalVendas) * 100).toFixed(1)
      : '0.0';
    
    return [
      `${index + 1}º`,
      produto.nome,
      produto.quantidade,
      Number(produto.valorTotal).toFixed(2).replace('.', ','),
      `${percentual}%`
    ];
  });
  
  toCSV([header, ...linhas], `relatorio_produtos_${getDataLocalYYYYMMDD()}.csv`);
}

function iniciarAtualizacaoAutomatica(){
  pararAtualizacaoAutomatica(); // Limpa timer anterior se existir
  // Atualiza a cada 30 segundos quando estiver na tela de relatórios
  timerRelatorios = setInterval(() => {
    if (document.getElementById('relatorios').classList.contains('active')) {
      carregarRelatorios();
    }
  }, 30000); // 30 segundos
}

function pararAtualizacaoAutomatica(){
  if (timerRelatorios) {
    clearInterval(timerRelatorios);
    timerRelatorios = null;
  }
}

/* ========= INICIAL ========= */
buscarClientes();

/* ESC fecha modais */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    ['cadastroClienteContainer','editarProdutoContainer','formVendaContainer'].forEach(id=>{ const el=document.getElementById(id); if(el) el.style.display='none'; });
  }
});
