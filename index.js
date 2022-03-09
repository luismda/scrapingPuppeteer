require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const xl = require('excel4node');
const wb = new xl.Workbook();
const ws = wb.addWorksheet('Planilha de produtos');

(async () => {

    const sleep = time => new Promise(resolve => {
        setTimeout(resolve, time)
    });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setDefaultNavigationTimeout(0);

    await page.goto('https://route66.com.br/login');
    
    await page.type('[type="text"]', process.env._CNPJ);
    await page.type('[type="password"]', process.env._PASS);

    await sleep(1200);

    await page.click('form[name="login"] button[type="submit"]'); 

    await sleep(2000);

    await page.goto('https://route66.com.br/busca?page=1');

    const ultimaPagina = await page.evaluate(() => {
        const paginacao = document.querySelectorAll('.pagination .page-item .page-link');
        const paginacaoArray = [...paginacao];
        const ultimaPagina = paginacaoArray[paginacaoArray.length - 2].innerText;

        return ultimaPagina;
    });

    let i = 1;
    let conteudo = [];
    while(i <=  ultimaPagina){

        let url = 'https://route66.com.br/busca?page='+i;

        await page.goto(url);

        const dadosRaspados = await page.evaluate(() => {

            const elementos = document.querySelectorAll('img.lazy.foto, small.codigo, a.nome, .bloco .preco, p.valor span.font-weight-bold.text-primary span.moeda.text-uppercase');
            const elementosArray = [...elementos];

            let elemento = [];
            elementosArray.forEach(dado => {
                if(dado.innerText == ''){
                    elemento.push(dado.getAttribute('data-src'));
                }else{
                    if(dado.innerText.slice(0, 8) == 'Código: '){
                        elemento.push(dado.innerText.slice(8));
                    }else{
                        elemento.push(dado.innerText);
                    }
                }

                if(dado.href){
                    elemento.push(dado.href);
                }
            });

            const dadosRaspados = elemento.filter(item => item != '| ');
    
            return dadosRaspados;

        }); 

        console.log('Extraindo dados. Página '+i);
        console.log('=-=-=-=-=-=-=-=-=-=');

        i++;
        conteudo.push(dadosRaspados);
    }
    
    // Gerando planilha do excel
    const nomesColunas = ['Imagem', 'Código', 'Marca', 'Nome', 'URL Produto', 'Preço'];

    let indexColunas = 1;
    nomesColunas.forEach(header => {
        ws.cell(1, indexColunas++).string(header);
    });

    let indexLinhas = 2;
    let colunaIndex = 1;
    conteudo.forEach(pagina => {
        pagina.forEach(escreve => {
            if(colunaIndex == 7){
                indexLinhas++;
                colunaIndex = 1;
            }

            ws.cell(indexLinhas, colunaIndex).string(escreve);
            colunaIndex++;    
        });    
    });

    wb.write('../produtos-planilha.xlsx');
    console.log('Planilha gerada!');

    await browser.close();

})();



    
