

import express from "express";
import request from "request";
import uuid4 from "uuid4";
import xmlparser from "express-xml-bodyparser"
import querystring from "querystring"
import url from 'url'
import { AI_PROMPT, Client, HUMAN_PROMPT } from "@anthropic-ai/sdk";

class BotClient {

    static token = "t-g10443hnHSES5555IXZAQF2U3IUAEOVMDW7RLGZM";
    static appid = "wx913b4e6ef0f77296";
    static appsec = "10d6526ecf73067ee830ded4247524ee";

    static async requestQ (ques) {
        return new Promise ((resolve,reject) => {
            request.post ("http://154.23.191.79/chat",{
                body : JSON.stringify ({
                    message : ques,
                }),
                // proxy :"http://127.0.0.1:7890",
                headers : {
                    "Content-Type": "application/json",
                },
            
            },(error,resp,body) => {
                if (!error && resp.statusCode == 200) {
                    let resp = JSON.parse(body);
                    // console.log (resp.choices [0].message.content);
                    resolve (resp);
                } else {
                    console.log (error);
                }
            })
        })
    }

    static requestClaude (ques) {
        const client = new Client(apiKey);
        client.complete({
            prompt: `${HUMAN_PROMPT} ${ques} ${AI_PROMPT}`,
            stop_sequences: [HUMAN_PROMPT],
            max_tokens_to_sample: 200,
            model: "claude-v1",
        })
        .then((finalSample) => {
            console.log(finalSample.completion);
        })
        .catch((error) => {
            console.error(error);
        });
    }

    static fetchToken () {

        return new Promise ((resolve,reject) => {
            request.get (`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${BotClient.appid}&secret=${BotClient.appsec}`,{
                headers : {
                    "Content-Type": "application/json",
                },
            
            },(error,resp,body) => {

                console.log (error,body);

                if (!error && resp.statusCode == 200) {
                    let resp = JSON.parse(body);
                    if (resp.code == 0) {
                        BotClient.token = resp.access_token
                        console.log ("New Token " + BotClient.token);
                    }
                    resolve (resp);
                } else {
                    console.log ("FetchToken Error" + resp.statusCode);
                }
            })
        })
    }

    static reply(res,msg,xml) {

        let msgid = xml.msgid;
        let chat_msg = xml.content;
        let fromusername = xml.fromusername;
        let tousername = xml.tousername ;

        let send_msg = `
        <xml>
            <ToUserName><![CDATA[${fromusername [0]}]]></ToUserName>
            <FromUserName><![CDATA[${tousername [0]}]]></FromUserName>
            <CreateTime>${new Date ().getTime ()}</CreateTime>
            <MsgType><![CDATA[text]]></MsgType>
            <Content><![CDATA[${msg}]]></Content>
        </xml>
        `;
        return new Promise ((resolve,reject) => {
            res.send (send_msg);
            resolve (true);
        });
    }

    static replyAsync (msg,toUserId) {

        console.log (`msg => ${msg},toUserId => ${toUserId}`)

        return new Promise ((resolve,reject) => {
            request.post (`https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${BotClient.token}`,{
                body : JSON.stringify ({
                    touser: toUserId,
                    msgtype: "text",
                    text: {
                        content : msg,
                    },
                }),
                headers : {
                    "Content-Type": "application/json",
                },
            
            },async (error,resp,body) => {
                if (!error && (resp.statusCode == 200 || resp.statusCode == 400)) {
                    let resp = JSON.parse(body);
                    if (resp.code == 99991663) {

                        // token expired 
                        console.log ("Token expired , fetch a new one.")
                        await BotClient.fetchToken ();
                        await BotClient.replyQ (msg,chat_id);
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
const port = 3300

app.use(express.json ());
app.use(express.urlencoded ());
app.use(xmlparser ());

app.post('/coin', async (req, res) => {
    BotClient.requestClaude (req.body.question);
})

app.get('/', async (req, res) => {
    res.send ("helloworld");
})

app.listen(port, async () => {
    console.log (`Server running at localhost:${port}`)
})

