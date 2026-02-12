import { Router } from 'express';
import * as technicianController from '../controllers/technician.controller';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authenticate);

// GET /technicians - List technicians for current provider
router.get('/', asyncHandler(technicianController.getTechnicians));

// POST /technicians - Add a new technician
router.post('/', asyncHandler(technicianController.addTechnician));

// PUT /technicians/:id - Update a technician
router.put('/:id', asyncHandler(technicianController.updateTechnician));

// DELETE /technicians/:id - Deactivate a technician (soft delete)
router.delete('/:id', asyncHandler(technicianController.deactivateTechnician));

export default router;
