const express = require("express");
const router = express.Router();
const authController = require("../../controllers/authController");
const authMiddleware = require("../../middleware/authMiddleware");

router.post("/registration", authController.registrationController);
router.post("/login", authController.loginController);
router.post("/logout", authMiddleware, authController.logoutController);
router.get("/verify-email/:token", authController.verifyEmailController);
router.post("/resend-verification", authController.resendVerificationController);
router.post("/forgot-password", authController.forgotPasswordController);
router.get("/reset-password/:token", authController.resetPasswordPageController);
router.post("/reset-password/:token", authController.resetPasswordController);
router.post("/refresh-token", authController.refreshTokenController);
router.get("/me", authMiddleware, authController.getMeController);

module.exports = router;
