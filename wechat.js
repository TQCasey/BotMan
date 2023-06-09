

import express from "express";
import request from "request";
import uuid4 from "uuid4";
import xmlparser from "express-xml-bodyparser"
import querystring from "querystring"
import url from 'url'
import { AI_PROMPT, Client, HUMAN_PROMPT } from "@anthropic-ai/sdk";

class BotClient {

    static TempDict = {
        textMessage : function (message,fromuser,touser) {
            let createTime = new Date ().getTime ();
            let send_msg = `
            <xml>
                <ToUserName><![CDATA[${touser}]]></ToUserName>
                <FromUserName><![CDATA[${fromuser}]]></FromUserName>
                <CreateTime>${createTime}</CreateTime>
                <MsgType><![CDATA[text]]></MsgType>
                <Content><![CDATA[${message}]]></Content>
            </xml>
            `;
            return send_msg;
        }
        ,
        imageMessage : function (message) {
            var createTime = new Date ().getTime ();
            return `${createTime}`
        }
        ,
        voiceMessage : function (message) {
            var createTime = new Date ().getTime ();
            return `${createTime}`
        }
        ,
        videoMessage : function (message) {
            var createTime = new Date ().getTime ();
            return `${createTime}`
        }
    }

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
        let send_msg = BotClient.TempDict.textMessage (msg,tousername [0],fromusername [0])
        
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
const port = 3200

app.use(express.json ());
app.use(express.urlencoded ());
app.use(xmlparser ());


app.post('/claude', async (req, res) => {
    console.log (req.body);
    BotClient.requestClaude (req.body.question);
})

app.post('/', async (req, res) => {

    console.log (req.body);
    
    // res.status(200).send("success");
    
    let xml = req.body.xml;
    let msgtype = xml.msgtype;

    switch (msgtype [0]) {
        case "text":

            console.log ("Requesting ...");

            // let answer = await BotClient.requestQ (chat_msg [0]);
            let amsg = "";

            // if (answer && answer.response) {
            //     amsg = answer?.response
            //     console.log ("answer",amsg);
            // } else {
            //     amsg = `AI不在线,稍后再试...`;
            // }

            amsg = `AI不在线,稍后再试...`;
            await BotClient.reply (res,amsg,xml);
            break;
        default:
            amsg = `只可以发文字哦...`;
            await BotClient.reply (res,amsg,xml);
    }
})

app.get('/', async (req, res) => {
    let argstr = url.parse (req.url).query;
    let argv = querystring.parse(argstr) || {};
    res.status(200).send (argv ["echostr"])
})

app.listen(port, async () => {
    console.log (`Server running at localhost:${port}`)
})

