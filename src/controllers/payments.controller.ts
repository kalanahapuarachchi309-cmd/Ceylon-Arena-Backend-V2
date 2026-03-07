import { Request, Response } from "express";
import PaymentModel, { PaymentStatus } from '../models/Payment';
import User from "../models/User";

export const getPayments = async (req: Request, res: Response) => {
    try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const skip = (page - 1) * limit;

    const [payments, totalCount] = await Promise.all([
      PaymentModel.find().sort({ paymentDate: -1 }).skip(skip).limit(limit),
      PaymentModel.countDocuments(),
    ]);

    res.json({
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      payments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

export const changePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!Object.values(PaymentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status"
      });
    }

    const payment = await PaymentModel.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    payment.status = status;
    await payment.save();

    // Keep user account status aligned with payment status.
    // COMPLETED => active user account, FAILED/PENDING => inactive.
    await User.findByIdAndUpdate(payment.userId, {
      accountStatus: status,
      status: status === PaymentStatus.COMPLETED,
    });

    res.json({
      success: true,
      message: "Payment status updated",
      payment
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

export const deletePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const payment = await PaymentModel.findByIdAndDelete(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    res.json({
      success: true,
      message: "Payment deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};