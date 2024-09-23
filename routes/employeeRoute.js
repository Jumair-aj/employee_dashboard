import express from 'express'
import { addEmployee, deleteEmployee, getAllEmployees, updateEmployee, } from '../services/employeeServices.js'
import Joi from 'joi';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { bulkUploadEmployee, downloadExcelEmployee } from '../services/excelServices.js';
import { logError, logInfo, logWarning } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router()
const upload = multer({ dest: 'uploads/' });

const employeeSchema = Joi.object({
    name: Joi.string().min(3).required(),
    salary: Joi.number().positive().required(),
    dob: Joi.date().required(),
});


router.get('/', async (req, res) => {
    const { salary } = req.query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const employees = await getAllEmployees(salary, limit, offset)
    res.send(employees)
})


router.post('/', async (req, res) => {
    const { error } = employeeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { name, salary, dob } = req.body
    try {
        const result = await addEmployee(name, salary, dob)
        res.status(201).json({ id: result.insertId, name, salary, dob });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
})


router.put('/:id', async (req, res) => {
    const { error } = employeeSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { id } = req.params;
    const { name, salary, dob } = req.body;
    try {
        const result = await updateEmployee(name, salary, dob, id)
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }
        res.json({ id, name, salary, dob });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
})

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {

        const result = await deleteEmployee(id)
        if (result.affectedRows === 0) {
            logError(`Failed to delete employee with ID: ${id}`);
            return res.status(404).json({ message: 'Employee not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
    logInfo(`Deleted employee with ID: ${id}`);
    res.json({ message: 'Employee deleted successfully' });

})



function excelDateToJSDate(serial) {
    const utc_days = Math.floor(serial - 25569);
    const date = new Date(utc_days * 86400 * 1000);
    return date.toISOString().split('T')[0];
}

router.post('/bulk-upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        logWarning('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, '..', req.file.path);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const employees = xlsx.utils.sheet_to_json(worksheet);
    const values = employees.map(emp => {
        const dob = typeof emp.DOB === 'number' ? excelDateToJSDate(emp.DOB) : emp.DOB;
        return [emp.Name, dob, emp.Salary];
    });
    const { result, err } = bulkUploadEmployee(values)
    if (err) return res.status(500).json({ error: 'Error importing employees' });
    logInfo(`Imported ${values.length} employees from ${filePath}`);
    res.status(200).json({ message: 'Employees imported successfully' });

});


router.get('/export/excel/:salary', async (req, res) => {
    const salary = parseFloat(req.params.salary);

    try {
        const excelBuffer = await downloadExcelEmployee(salary);
        const filename = `employees-above-${salary}.xlsx`;
        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
        logInfo(`Exported to Excel: ${filename}`);
    } catch (error) {
        logError(error);
        console.error('Error exporting to Excel:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



export default router