import db from "../config/db.js"
import XLSX from 'xlsx';

export const bulkUploadEmployee = async (values) => {
    const [result, err] = await db.query('INSERT INTO employee (name, dob, salary) VALUES ?', [values])
    return result, err
}

export const downloadExcelEmployee = async (salary) => {
    const [rows] = await db.query('SELECT * FROM employee WHERE salary > ?', [salary]);

    const data = rows.map(employee => ({
        Name: employee.name,
        DOB: new Date(employee.dob).toISOString().split('T')[0],
        Salary: employee.salary
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return excelBuffer
}

