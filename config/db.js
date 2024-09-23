import mysql from 'mysql2/promise'

const pool = mysql.createPool({
    host: 'sql12.freesqldatabase.com',
    user:'sql12732861',
    password:'YryhmGmHRt',
    database:'sql12732861'
})

export default pool