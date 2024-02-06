import express from 'express'
const router = express.Router()
import employeesController from '../../controllers/employeesController.js'

router
    .route('/')
    .get(employeesController.getAllEmployees)
    .post(employeesController.createNewEmployee)
    .put(employeesController.updateEmployee)
    .delete(employeesController.deleteEmployee)

router.route('/:id').get(employeesController.getEmployee)

export default router
