"use client";

import { notification } from "~~/utils/scaffold-eth";

/**
 * Wrapper to handle async transaction with notifications
 */
export const withTransactionNotification = async <T>(
  pendingMessage: string,
  successMessage: string,
  errorMessage: string,
  transaction: () => Promise<T>,
): Promise<T | null> => {
  const txId = notification.loading(pendingMessage);

  try {
    const result = await transaction();
    notification.remove(txId);
    notification.success(successMessage);
    return result;
  } catch (error) {
    notification.remove(txId);
    notification.error(errorMessage);
    console.error(error);
    return null;
  }
};
