const express = require('express');
const router = express.Router();
const {
    // Auth controllers
    signup,
    verifyOtp,
    resendOtp,
    login,
    signout,

    // Profile controllers
    getUserProfile,
    getActiveUsersProfile,
    getUserByWhatsapp,

    // Plan controllers
    planActive,

    // Content controllers
    getAllContentOfActiveUser,

    // Project controllers
    createProject,
    getProject,
    deleteProject,
    updateProjectStatus,

    // Task controllers
    createTask,
    getTask,
    deleteTask,

    // Payment controllers
    createPayment,
    getPayment,
    deletePayment,
    markPaymentPaid,
    getDuePayments,

    // Reminder controllers
    createReminder,
    getReminder,
    deleteReminder,
    cancelRelatedReminders,

    // Message controllers
    createMessages,
    getMessages,
    deleteMessages,

    // Confirmation controllers
    createConfirmation,
    getConfirmation,
    deleteConfirmation,

    // Temp message controllers
    createTempMessages,
    getTempMessages,
    deleteTempMessages,
    getDueReminders,
    deleteDueRows,
    get24HItem

} = require('./controllers.js');

// ==================== TEST ROUTE ====================


// ==================== AUTH ROUTES ====================
router.post('/verifyOtp', verifyOtp)
router.post('/resendOtp', resendOtp)
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', signout);

// ==================== USER PROFILE ROUTES ====================
router.get('/profile', getUserProfile);
router.get('/active-users', getActiveUsersProfile);
router.post('/getuserbywhatsapp', getUserByWhatsapp);  // For n8n

// ==================== PLAN ROUTES ====================
router.post('/plan/activate', planActive);

// ==================== CONTENT ROUTES ====================
router.get('/content/all', getAllContentOfActiveUser);

// ==================== PROJECT ROUTES ====================
router.post('/createproject', createProject);


router.get('/projects', getProject);
router.delete('/projects/:projectId', deleteProject);
router.put('/projects/status', updateProjectStatus);

// ==================== TASK ROUTES ====================
router.post('/createtask', createTask);
router.get('/tasks', getTask);

router.delete('/tasks/:taskId', deleteTask);

// ==================== PAYMENT ROUTES ====================
router.post('/createpayments', createPayment);
router.get('/payments', getPayment);
router.delete('/payments/:paymentId', deletePayment);
router.put('/payments/mark-paid', markPaymentPaid);
router.get('/payments/due', getDuePayments);

// ==================== REMINDER ROUTES ====================
router.post('/createreminders', createReminder);
router.get('/reminders', getReminder);

router.delete('/reminders/:id', deleteReminder);
router.put('/reminders/cancel-related', cancelRelatedReminders);

// ==================== MESSAGE ROUTES ====================
router.post('/messages', createMessages);
router.get('/messages', getMessages);
router.delete('/messages', deleteMessages);

// ==================== CONFIRMATION ROUTES ====================
router.post('/confirmations', createConfirmation);
router.get('/getconfirmation', getConfirmation);
router.delete('/confirmations/:id', deleteConfirmation);

// ==================== TEMP MESSAGE ROUTES ====================
router.post('/createtempmessages', createTempMessages);
router.get('/gettempmessages', getTempMessages);
router.delete('/deletetempmessages', deleteTempMessages);

router.get('/getduereminders', getDueReminders)
router.get('/get24hitem', get24HItem)
router.delete('/deleteduerows', deleteDueRows)


module.exports = router;