

import express from "express";
import request from "request";
import bodyParser from "body-parser";
import uuid4 from "uuid4";
import RedisUtil from "./redis";

class BotClient {

    static token = "t-g10443hnHSES5555IXZAQF2U3IUAEOVMDW7RLGZM";
    static appid = "cli_a4af8f5d0b10100d";
    static appsec = "s9f8F71GXZg658SHeIjOcfDXQIh156aH";
    static chatSessions = {};

    static async requestBot (chat_id,ques,useProxy) {

        let prevAnswer = BotClient.chatSessions [chat_id] || {};
        let parenttId = prevAnswer.messageId

        console.log (`parentMsgId => ${parenttId}`)
        let proxyStr = useProxy ? "http://127.0.0.1:7890" : null;
        let serverUrl = "http://154.23.191.79/chat";

        let res = await RedisUtil.getInstance ().getItem ("ChatGPT-API-URL");

        return new Promise ((resolve,reject) => {
            request.post (serverUrl,{
                body : JSON.stringify ({
                    message : ques,
                    conversationId : chat_id,
                    parentMessageId : parenttId,
                }),
                proxy : proxyStr,
                headers : {
                    "Content-Type": "application/json",
                },
            
            },(error,resp,body) => {
                if (!error && resp.statusCode == 200) {
                    let resp = JSON.parse(body);
                    // console.log (resp.choices [0].message.content);
                    resolve (resp);
                } else {
                    console.log (error,body);
                    resolve ({})
                }
            })
        })
    }

    static fetchToken () {
        return new Promise ((resolve,reject) => {
            request.post ("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal",{
                body : JSON.stringify ({
                    app_id: BotClient.appid,
                    app_secret: BotClient.appsec,
                }),
                headers : {
                    "Content-Type": "application/json",
                },
            
            },(error,resp,body) => {

                if (!error && resp.statusCode == 200) {
                    let resp = JSON.parse(body);
                    if (resp.code == 0) {
                        BotClient.token = resp.app_access_token
                        console.log ("New Token " + BotClient.token);
                    }
                    resolve (resp);
                } else {
                    console.log ("FetchToken Error" + resp.statusCode);
                }
            })
        })
    }

    static reply (msg,chat_id) {

        let tokenStr = "Bearer " + BotClient.token;

        return new Promise ((resolve,reject) => {
            request.post ("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=chat_id",{
                body : JSON.stringify ({
                    receive_id: chat_id,
                    msg_type: "text",
                    content: JSON.stringify({
                        text : msg,
                    }),
                    uuid: uuid4 (),
                }),
                headers : {
                    "Content-Type": "application/json",
                    "Authorization": tokenStr
                },
            
            },async (error,resp,body) => {
                if (!error && (resp.statusCode == 200 || resp.statusCode == 400)) {
                    let resp = JSON.parse(body);
                    if (resp.code == 99991663) {

                        // token expired 
                        console.log ("Token expired , fetch a new one.")
                        await BotClient.fetchToken ();
                        await BotClient.reply (msg,chat_id);
                    }
                    resolve (resp);
                } else {
                    console.log ("Reply Error" + resp.statusCode);
                }
            })
        })
    }    
}

const app = express()
const port = 3100

app.use(bodyParser.json());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', 'Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method' )
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE')
    res.header('Allow', 'GET, POST, PATCH, OPTIONS, PUT, DELETE')
    next();
});

app.post('/', async (req, res) => {

    if (req.body && req.body.challenge) {
        res.send (req.body);
        return ;
    }

    res.status(200).send ("");

    let params = req.body;
    if (params && params.event && params.event.message) {
        let chat_id = params.event.message.chat_id;
        if (chat_id) {
            let msgobj = JSON.parse (params.event.message.content);
            let chat_msg = msgobj.text;

            console.log ("chat_msg",chat_msg);
            console.log ("chat_id",chat_id);
            
            await BotClient.reply ("好的，稍等...",chat_id);

            let answer = await BotClient.requestBot (chat_id,chat_msg,false);

            // save  chat sessions 
            BotClient.chatSessions [chat_id] = answer;

            if (answer && answer.response) {
                let amsg = answer?.response;
                console.log ("answer",amsg);
                await BotClient.reply (amsg,chat_id);
            } else {
                await BotClient.reply ("我刚走神了,再试一遍就可以...",chat_id);
            }
        }
    }
})

app.post('/chat', async (req, res) => {

    let params = req.body;
    
    console.log (params);
    
    if (params && params.ques && params.chat_id) {
        let chat_id = params.chat_id;
        let chat_msg = params.ques;
        
        if (chat_id && chat_msg) {
            
            console.log ("chat_msg",chat_msg);
            console.log ("chat_id",chat_id);

            let answer = await BotClient.requestBot (chat_id,chat_msg,false);

            // save  chat sessions 
            BotClient.chatSessions [chat_id] = answer;

            if (answer && answer.response) {
                let amsg = answer?.response;
                console.log ("answer",amsg);
                res.json ({
                    resp : amsg,
                })
            } else {
                res.json ({
                    resp : "我刚走神了,再试一遍就可以...",
                })
            }
        } else {
            res.json ({
                resp : "参数不全"
            })
        }
    }
})

app.listen(port, async () => {
    console.log (`Server running at localhost:${port}`)
})

