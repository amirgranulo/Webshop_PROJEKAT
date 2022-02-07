const { Pool } = require('pg')

const pool = new Pool({
    user: 'fnjhtzwd',
    host: 'abul.db.elephantsql.com',
    database: 'fnjhtzwd',
    password: 'snYNJNPKQkz4QoWUuXokO7DAiG8sw9uA',
    port: 5432,
    max : 100,
    idleTimeoutMillis: 30000
});


module.exports = {
    query: (text, params, callback) => {
        return pool.query(text, params, callback)
    }
}