import db from "../config/db.js"

export const getAllEmployees = async (salary, limit, offset) => {
    if (salary) {
        const [employees] = await db.query("SELECT * FROM employee where salary > ? LIMIT ? OFFSET ?", [salary, limit, offset]);
        const [total] = await db.query('SELECT COUNT(*) AS total FROM employee where salary > ?', [salary])
        return {employees, total:total[0].total}
    }
    else {
        const [employees] = await db.query('SELECT * FROM employee LIMIT ? OFFSET ?', [limit, offset])
        const [total] = await db.query('SELECT COUNT(*) AS total FROM employee')
        return {employees, total:total[0].total}
    }
}

export const addEmployee = async (name, salary, dob) => {
    const result = await db.query(
        'INSERT INTO employee (name, salary, dob) VALUES (?, ?, ?)',
        [name, salary, dob]
    );
    return result
}


export const updateEmployee = async (name, salary, dob, id) => {

    const [result] = await db.query(
        'UPDATE employee SET name = ?, salary = ?, dob = ? WHERE id = ?',
        [name, salary, dob, id]
    );
    return result

}

export const deleteEmployee = async (id) => {
    const [result] = await db.query('DELETE FROM employee WHERE id = ?', [id]);
    return result

}




