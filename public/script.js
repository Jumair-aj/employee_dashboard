const employeeTableBody = document.getElementById('employeeTableBody');
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const modal = document.getElementById('modal');
const closeBtn = document.getElementsByClassName('close')[0];
const employeeForm = document.getElementById('employeeForm');
const confirmModal = document.getElementById('confirmModal');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const logoutBtn = document.getElementById('logoutBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');

const excelUpload = document.getElementById('excelUpload');
const nameInput = document.getElementById('name');
const dobInput = document.getElementById('dob');
const salaryInput = document.getElementById('salary');
const salaryRangeInput = document.getElementById('salaryRange');

const actionTr= document.getElementById('actionTh')

let employees = [];
let currentEmployeeId = null;

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDarkTheme = document.body.classList.contains('dark-theme');
    localStorage.setItem('darkTheme', isDarkTheme);
    updateThemeIcon(isDarkTheme);
}

function updateThemeIcon(isDarkTheme) {
    const icon = themeToggleBtn.querySelector('i');
    icon.className = isDarkTheme ? 'fas fa-sun' : 'fas fa-moon';
}

const savedTheme = localStorage.getItem('darkTheme');
if (savedTheme === 'true') {
    document.body.classList.add('dark-theme');
    updateThemeIcon(true);
}

let isFetching = false;

let currentPage = 1;
const employeesPerPage = 10;
let totalEmployees = 0;

let userType= ''

fetch('/api/user')
.then(response => response.json())
.then(user => {
    if (user) {
        document.getElementById('user-info').innerHTML = `
Welcome, ${user.username}!
        `;
        userType = user.role
    }
    else{
        window.location.href = '/';
    }
}
);


function fetchEmployees() {
    if (isFetching) return;
    isFetching = true;
    if (salaryRangeInput.value) {
        fetch(`/api/employees?page=${currentPage}&limit=${employeesPerPage}&salary=${salaryRangeInput.value}`)
            .then(response => response.json())
            .then(data => {
                employees = [...employees, ...data.employees];
                totalEmployees = data.total;
                renderEmployees();
                currentPage++;
                isFetching = false;
            });
    }
    else {
        fetch(`/api/employees?page=${currentPage}&limit=${employeesPerPage}`)
            .then(response => response.json())
            .then(data => {
                employees = [...employees, ...data.employees];
                totalEmployees = data.total;
                renderEmployees();
                currentPage++;
                isFetching = false;
            });
    }
}

function salaryFilteredEmployees() {
    if (isFetching) return;
    isFetching = true;
    if (salaryRangeInput.value) {
        currentPage = 1
        employees = []
        fetch(`/api/employees?page=${currentPage}&limit=${employeesPerPage}&salary=${salaryRangeInput.value}`)
            .then(response => response.json())
            .then(data => {
                employees = [...employees, ...data.employees];
                totalEmployees = data.total;
                renderEmployees();
                currentPage++;
                isFetching = false;
            });
    }
    else{
        showToast('Please enter salary','error');
    }
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        if (employees.length < totalEmployees) {
            fetchEmployees(currentPage);
        }
    }
});

function renderEmployees() {
    employeeTableBody.innerHTML = '';
    employees.forEach(employee => {
        const row = document.createElement('tr');
        if(userType === 'admin'){
            row.innerHTML = `
            <td>${employee.name}</td>
            <td>${new Date(employee.dob).toLocaleDateString()}</td>
            <td>$${employee.salary}</td>
            <td>
            <button class="btn btn-primary edit-btn" data-id="${employee.id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger delete-btn" data-id="${employee.id}"><i class="fas fa-trash"></i></button>
            </td>
            `;
            }
            else{
                actionTr.style.display='none';
                addEmployeeBtn.style.display='none';
                row.innerHTML = `
                <td>${employee.name}</td>
                <td>${new Date(employee.dob).toLocaleDateString()}</td>
                <td>$${employee.salary}</td>
                `;
            }
        employeeTableBody.appendChild(row);
        row.style.opacity = '0';
        setTimeout(() => {
            row.style.transition = 'opacity 0.3s ease-in-out';
            row.style.opacity = '1';
        }, 10);
    });
}

addEmployeeBtn.onclick = () => {
    openModal('Add Employee');
};

employeeTableBody.addEventListener('click', (e) => {
    if (e.target.closest('.edit-btn')) {
        const id = parseInt(e.target.closest('.edit-btn').getAttribute('data-id'));
        const employee = employees.find(emp => emp.id === id);
        openModal('Edit Employee', employee);
    } else if (e.target.closest('.delete-btn')) {
        const id = parseInt(e.target.closest('.delete-btn').getAttribute('data-id'));
        openConfirmModal(id);
    }
});

function openModal(title, employee = null) {
    document.getElementById('modalTitle').textContent = title;
    ;
    document.getElementById('employeeId').value = employee ? employee.id : '';
    document.getElementById('name').value = employee ? employee.name : '';
    document.getElementById('dob').value = employee ? new Date(employee.dob).toISOString().substr(0, 10) : '';
    document.getElementById('salary').value = employee ? employee.salary : '';
    if (title.includes('Edit')) {
        document.getElementsByClassName('excelUploadDiv')[0].style.display = 'none';
        document.getElementsByClassName('or')[0].style.display = 'none';
    }
    else {
        document.getElementsByClassName('excelUploadDiv')[0].style.display = 'block';
        document.getElementsByClassName('or')[0].style.display = 'block';

    }
    modal.style.display = 'block';
    setTimeout(() => {
        modal.querySelector('.modal-content').style.opacity = '1';
        modal.querySelector('.modal-content').style.transform = 'translateY(0)';
    }, 10);
}

employeeForm.onsubmit = (e) => {
    e.preventDefault();
    const id = document.getElementById('employeeId').value;
    const employee = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        salary: parseFloat(document.getElementById('salary').value)
    };

    if (id) {
        fetch(`/api/employees/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employee)
        })
            .then(() => {
                currentPage = 1;
                employees = [];
                fetchEmployees();
                closeModal();
                showToast('Employee updated successfully!');
            });
    } else {
        fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(employee)
        })
            .then(() => {
                currentPage = 1;
                employees = []
                fetchEmployees();
                closeModal();
                showToast('Employee added successfully!');
            });
    }
};

function openConfirmModal(id) {
    currentEmployeeId = id;
    confirmModal.style.display = 'block';
    setTimeout(() => {
        confirmModal.querySelector('.modal-content').style.opacity = '1';
        confirmModal.querySelector('.modal-content').style.transform = 'translateY(0)';
    }, 10);
}

confirmDeleteBtn.onclick = () => {
    if (currentEmployeeId) {
        fetch(`/api/employees/${currentEmployeeId}`, { method: 'DELETE' })
            .then(() => {
                currentPage = 1;
                employees = [];
                fetchEmployees();
                closeConfirmModal();
                showToast('Employee deleted successfully!');
            });
    }
};

function closeModal() {
    modal.querySelector('.modal-content').style.opacity = '0';
    modal.querySelector('.modal-content').style.transform = 'translateY(-50px)';
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function closeConfirmModal() {
    confirmModal.querySelector('.modal-content').style.opacity = '0';
    confirmModal.querySelector('.modal-content').style.transform = 'translateY(-50px)';
    setTimeout(() => {
        confirmModal.style.display = 'none';
    }, 300);
}

window.onclick = (event) => {
    if (event.target == modal) {
        closeModal();
    }
    if (event.target == confirmModal) {
        closeConfirmModal();
    }
};


addEmployeeBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    resetForm();
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

function resetForm() {
    employeeForm.reset();
    nameInput.disabled = false;
    dobInput.disabled = false;
    salaryInput.disabled = false;
    excelUpload.value = '';  
}

excelUpload.addEventListener('change', () => {
    if (excelUpload.files.length > 0) {
        nameInput.disabled = true;
        dobInput.disabled = true;
        salaryInput.disabled = true;
    } else {
        nameInput.disabled = false;
        dobInput.disabled = false;
        salaryInput.disabled = false;
    }
});

employeeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (excelUpload.files.length > 0) {
        const formData = new FormData();
        formData.append('file', excelUpload.files[0]);

        const response = await fetch('/api/employees/bulk-upload', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showToast('Employees added successfully!');
            modal.style.display = 'none';
            fetchEmployees();
        } else {
            showToast('Error uploading employees');
        }
    } 
    // else {
    //     const newEmployee = {
    //         name: nameInput.value,
    //         dob: dobInput.value,
    //         salary: salaryInput.value
    //     };

    //     const response = await fetch('/api/employees', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify(newEmployee)
    //     });

    //     if (response.ok) {
    //         showToast('Employee added successfully!');
    //         modal.style.display = 'none';
    //         fetchEmployees();
    //     } else {
    //         showToast('Error adding employee');
    //     }
    // }
});


const toastContainer = document.getElementById('toast-container');

function createToastElement(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    
    const messageElement = document.createElement('span');
    messageElement.className = 'toast-message';
    messageElement.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = '&times;';
    closeButton.addEventListener('click', () => removeToast(toast));
    
    toast.appendChild(icon);
    toast.appendChild(messageElement);
    toast.appendChild(closeButton);
    
    return toast;
}

function showToast(message, type = 'info') {
    const toast = createToastElement(message, type);
    toastContainer.appendChild(toast);
    
    // Trigger reflow to enable animation
    toast.offsetHeight;
    
    toast.classList.add('show');
    
    setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast) {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
        toast.remove();
    });
}

// Example usage:
// showToast('Success message', 'success');
// showToast('Error message', 'error');
// showToast('Info message', 'info');
document.getElementById('exportExcelBtn').addEventListener('click', async () => {
    const salary = parseFloat(salaryRangeInput.value);
    if (salary) {
        try {
            const response = await fetch(`/api/employees/export/excel/${salary}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `employees-above-${salary}.xlsx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast('Downloaded Successfully');
            } else {
                showToast('Failed to export employees');
            }
        } catch (error) {
            console.error('Error exporting Excel:', error);
        }
    }
    else{
        showToast('Please enter salary','error');
    }
});

fetchEmployees();

