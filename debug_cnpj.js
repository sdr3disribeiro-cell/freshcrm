
const https = require('https');

https.get('https://brasilapi.com.br/api/cnpj/v1/10796675000142', (resp) => {
    let data = '';

    resp.on('data', (chunk) => {
        data += chunk;
    });

    resp.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("SITUACAO_CADASTRAL:", json.situacao_cadastral); // This is likely integer 2
            console.log("DESCRICAO_SITUACAO_CADASTRAL:", json.descricao_situacao_cadastral); // This is likely "ATIVA"
            console.log("FULL JSON:", JSON.stringify(json, null, 2));
        } catch (e) {
            console.error(e.message);
            console.log(data);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
