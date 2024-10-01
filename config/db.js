import mysql from 'mysql2/promise'

const pool = mysql.createPool({
    host: 'mysql-employee.alwaysdata.net',
    user:'employee',
    password:'absdkhbasdh123a',
    database:'employee_db'
})

export default pool