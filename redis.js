const redis = require('redis');

let redisConfig = {
    host: "127.0.0.1",
    port: 6379,
};

class RedisUtil {
    constructor() {

        this.redis_conn = redis.createClient(redisConfig.port, redisConfig.host);

        this.redis_conn.on('connect', (err) => {
            console.log("Redis 连接成功")
        })

        this.redis_conn.on('error', (err) => {
            console.error("Redis 错误", err);
        })

        this.redis_conn.on('ready', () => {
            console.log("Redis 就绪");
        })


    }

    checkRedis() {
        if (!this.redis_conn) {
            return "无效redis连接";
        }

        return null;
    }

    setItem(key, value, timeout) {

        let self = this;

        return new Promise((resolve, reject) => {
            // arguments check 
            let error = null;
            if ((error = self.checkRedis())) {
                reject(new Error(error));
                return;
            }

            // set value 
            self.redis_conn.set(key, value, (err, res) => {
                // expire 
                timeout && self.redis_conn.expire(key, timeout);
                resolve(res);
            });
        })
    }

    getItem(key) {

        let self = this;

        return new Promise((resolve, reject) => {
            // arguments check 
            let error = null;
            if ((error = self.checkRedis())) {
                reject(new Error(error));
                return;
            }
            // get value 
            self.redis_conn.get(key, (err, res) => {
                resolve(res);
            })
        })
    }

    decItem(key) {
        let self = this;

        return new Promise((resolve, reject) => {
            // arguments check 
            let error = null;
            if ((error = self.checkRedis())) {
                reject(new Error(error));
                return;
            }
            // decr value 
            self.redis_conn.decr(key, (err, res) => {
                resolve(res);
            })
        })
    }

    decbyItem(key, num) {
        let self = this;

        return new Promise((resolve, reject) => {
            // arguments check 
            let error = null;
            if ((error = self.checkRedis())) {
                reject(new Error(error));
                return;
            }
            // decr value 
            num = parseInt(num) || 0;
            self.redis_conn.decrby(key, num, (err, res) => {
                // console.log (res);
                resolve(res);
            })
        })
    }

    incbyItem(key, num) {

        let self = this;

        return new Promise((resolve, reject) => {
            // arguments check 
            let error = null;
            if ((error = self.checkRedis())) {
                reject(new Error(error));
                return;
            }
            // decr value 
            num = parseInt(num) || 0;
            self.redis_conn.incrby(key, num, (err, res) => {
                // console.log (res);
                resolve(res);
            })
        })
    }

    static getInstance () {
        if (!RedisUtil.instance) {
            RedisUtil.instance = new RedisUtil ();
        }

        return RedisUtil.instance;
    }
};

module.exports = RedisUtil;

