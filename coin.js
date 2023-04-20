

import express from "express";
import request from "request";
import uuid4 from "uuid4";
import xmlparser from "express-xml-bodyparser"
import querystring from "querystring"
import url from 'url'

class BotClient {

    static apikeys = [
        "b8fcb0c9-2649-4800-85d3-3c8fc1d09685",
    ]
    static curApiKeyIndex = 0;
    static bRun = false;

    static getValidKey () {
        return this.apikeys [this.curApiKeyIndex];
    }

    static async requestCoinInfo (params) {
        
        let key = this.getValidKey ();

        return new Promise ((resolve,reject) => {

            let queryParams = new URLSearchParams({
                "symbol": "CFX,DOGE",
                "convert": "USD"
            })

            request.get (`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?${queryParams}`,{
                proxy :"http://127.0.0.1:7890",
                headers : {
                    "Content-Type": "application/json",
                    "X-CMC_PRO_API_KEY": key
                },
            
            },(error,resp,body) => {
                if (!error && resp.statusCode == 200) {
                    let resp = JSON.parse(body);
                    resolve (resp);
                } else {
                    reject (error);
                }
            })
        })
    }

    static notifyMsg (msg) {
        return new Promise ((resolve,reject) => {
            request.post (`https://open.feishu.cn/open-apis/bot/v2/hook/72aff10a-ef55-4e53-a86e-953ef6af7365`,{
                body : JSON.stringify ({
                    msg_type: "text",
                    content: {
                        text : msg,
                    },
                }),
                headers : {
                    "Content-Type": "application/json",
                },
            
            },async (error,resp,body) => {
                if (!error && (resp.statusCode == 200 || resp.statusCode == 400)) {
                    let resp = JSON.parse(body);
                    if (resp.code == 0) {
                        // console.log ("Notify Succeed")
                    }
                    resolve (resp);
                } else {
                    console.log ("Notify Error",error);
                    reject (error);
                }
            })
        })
    }

    static async queryInfo () {
        let resp = await BotClient.requestCoinInfo (null);
        let msg = '';
        let data = resp.data;
        for (let name in data) {
            let info = data [name];
            if (info?.quote) {
                let quote = info.quote;
                msg += `货币 ${name},当前价格为 ${quote.USD.price} USD \n`;
            }
        }

        return msg;
    }

    static async run () {
        this.bRun = true;
        while (this.bRun) {
            let msg = await this.queryInfo ();
            BotClient.notifyMsg (msg);
            await new Promise(resolve => setTimeout(resolve, 10000))
        }
    }

    static async stop () {
        this.bRun = false;
    }
}

const app = express()
const port = 3300

app.use(express.json ());
app.use(express.urlencoded ());
app.use(xmlparser ());

app.get('/coin/start', (req,res) => {
    BotClient.run ();
    res.send ("OK")
});

app.get('/coin/stop', (eq,res) => {
    BotClient.stop ();
    res.send ("OK")
});

app.get('/', async (req, res) => {
    res.send ("helloworld");
})

app.listen(port, async () => {
    console.log (`Server running at localhost:${port}`)
})

