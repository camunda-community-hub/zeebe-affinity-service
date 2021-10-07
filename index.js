const { RedisAffinity } = require('./dst/index')

const main = async () => {
    const zbcRedis = new RedisAffinity('localhost:26500', {
        host: 'localhost:6379',
        password: 'redis',
    })

    await zbcRedis.createProcessInstance('default-task', {
        correlationKey: '123456789',
    })
}

main()
