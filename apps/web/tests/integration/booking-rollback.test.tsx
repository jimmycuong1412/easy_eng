/**
 * Booking Flow with Rollback Integration Tests
 * 
 * Tests the complete booking flow with Gems discount,
 * including rollback scenarios when failures occur
 * 
 * Test-First Approach: These tests should FAIL until implementation is complete
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { getGemsBalance } from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client');

describe('Booking Flow with Rollback', () => {
  const mockUser = {
    id: 'test-user-1',
    email: 'student@test.com',
    role: 'student',
  };

  const mockClass = {
    id: 'class-123',
    title: 'Advanced English Conversation',
    price: 20,
    teacher: {
      id: 'teacher-1',
      name: 'John Doe',
    },
    schedule: '2024-02-01 10:00',
    duration: 60,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock initial Gems balance
    (getGemsBalance as jest.Mock).mockResolvedValue(1000);
  });

  describe('Successful Booking Flow', () => {
    it('should complete booking with Gems discount successfully', async () => {
      const user = userEvent.setup();

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      // Verify initial state
      expect(screen.getByText('Available Gems: 1,000')).toBeInTheDocument();
      expect(screen.getByText('Class Price: $20.00')).toBeInTheDocument();

      // Adjust Gems slider to use 500 Gems ($5 discount)
      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      await user.click(gemsSlider);
      fireEvent.change(gemsSlider, { target: { value: '500' } });

      // Verify discount calculation
      await waitFor(() => {
        expect(screen.getByText('Gems Discount: $5.00')).toBeInTheDocument();
        expect(screen.getByText('Final Price: $15.00')).toBeInTheDocument();
      });

      // Enter payment details
      const cardInput = screen.getByLabelText(/card number/i);
      await user.type(cardInput, '4242424242424242');

      // Submit booking
      const bookButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(bookButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument();
      });

      // Verify Gems were deducted
      expect(getGemsBalance).toHaveBeenCalledWith(mockUser.id);
    });

    it('should enforce 50% discount cap', async () => {
      const user = userEvent.setup();

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      // Try to use 1500 Gems ($15, which is 75% of $20)
      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      fireEvent.change(gemsSlider, { target: { value: '1500' } });

      // Should be capped at 1000 Gems (50% = $10)
      await waitFor(() => {
        expect(screen.getByText('Gems Used: 1,000')).toBeInTheDocument();
        expect(screen.getByText('Gems Discount: $10.00')).toBeInTheDocument();
        expect(screen.getByText('Final Price: $10.00')).toBeInTheDocument();
      });

      // Should show warning
      expect(screen.getByText(/maximum 50% discount/i)).toBeInTheDocument();
    });

    it('should enforce $5 minimum price floor', async () => {
      const cheapClass = { ...mockClass, price: 8 };
      const user = userEvent.setup();

      render(<BookingFlow classData={cheapClass} user={mockUser} />);

      // Try to use 500 Gems ($5, but would make price $3)
      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      fireEvent.change(gemsSlider, { target: { value: '500' } });

      // Should be capped at 300 Gems (price can't go below $5)
      await waitFor(() => {
        expect(screen.getByText('Gems Used: 300')).toBeInTheDocument();
        expect(screen.getByText('Final Price: $5.00')).toBeInTheDocument();
      });

      // Should show warning
      expect(screen.getByText(/minimum price is \$5/i)).toBeInTheDocument();
    });
  });

  describe('Payment Failure Rollback', () => {
    it('should rollback Gems deduction if payment fails', async () => {
      const user = userEvent.setup();

      // Mock payment failure
      const mockProcessBooking = jest.fn().mockRejectedValue(
        new Error('Payment declined')
      );
      jest.spyOn(require('@/lib/api-client'), 'processBooking')
        .mockImplementation(mockProcessBooking);

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      // Use Gems
      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      fireEvent.change(gemsSlider, { target: { value: '500' } });

      // Enter payment details
      const cardInput = screen.getByLabelText(/card number/i);
      await user.type(cardInput, '4000000000000002'); // Declined card

      // Attempt booking
      const bookButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(bookButton);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/payment declined/i)).toBeInTheDocument();
      });

      // Verify Gems balance unchanged
      const balance = await getGemsBalance(mockUser.id);
      expect(balance).toBe(1000); // Original balance

      // Verify no booking was created
      expect(mockProcessBooking).toHaveBeenCalledTimes(1);
    });

    it('should restore Gems if booking creation fails', async () => {
      const user = userEvent.setup();

      // Mock booking creation failure
      jest.spyOn(require('@/lib/api-client'), 'processBooking')
        .mockRejectedValue(new Error('Class is full'));

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      // Use Gems
      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      fireEvent.change(gemsSlider, { target: { value: '500' } });

      // Attempt booking
      const bookButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(bookButton);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/class is full/i)).toBeInTheDocument();
      });

      // Gems should not be deducted
      expect(screen.getByText('Available Gems: 1,000')).toBeInTheDocument();
    });

    it('should handle network error gracefully with rollback', async () => {
      const user = userEvent.setup();

      // Mock network error
      jest.spyOn(require('@/lib/api-client'), 'processBooking')
        .mockRejectedValue(new Error('Network error'));

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      fireEvent.change(gemsSlider, { target: { value: '500' } });

      const bookButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(bookButton);

      // Verify error and rollback
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText('Available Gems: 1,000')).toBeInTheDocument();
      });

      // User should be able to retry
      expect(bookButton).toBeEnabled();
    });
  });

  describe('Insufficient Gems Handling', () => {
    it('should prevent booking with insufficient Gems', async () => {
      (getGemsBalance as jest.Mock).mockResolvedValue(300); // Only 300 Gems

      const user = userEvent.setup();

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Available Gems: 300')).toBeInTheDocument();
      });

      // Try to use 500 Gems
      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      fireEvent.change(gemsSlider, { target: { value: '500' } });

      // Should be capped at 300
      await waitFor(() => {
        expect(screen.getByText('Gems Used: 300')).toBeInTheDocument();
      });

      // Should show warning
      expect(screen.getByText(/insufficient gems/i)).toBeInTheDocument();
    });

    it('should show zero Gems state correctly', async () => {
      (getGemsBalance as jest.Mock).mockResolvedValue(0);

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Available Gems: 0')).toBeInTheDocument();
      });

      // Gems slider should be disabled
      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      expect(gemsSlider).toBeDisabled();

      // Should show message
      expect(screen.getByText(/no gems available/i)).toBeInTheDocument();

      // Final price should be full price
      expect(screen.getByText('Final Price: $20.00')).toBeInTheDocument();
    });
  });

  describe('Concurrent Booking Prevention', () => {
    it('should prevent double-submission', async () => {
      const user = userEvent.setup();
      let callCount = 0;

      // Mock slow processing
      const mockProcessBooking = jest.fn().mockImplementation(() => {
        callCount++;
        return new Promise((resolve) => setTimeout(resolve, 1000));
      });
      jest.spyOn(require('@/lib/api-client'), 'processBooking')
        .mockImplementation(mockProcessBooking);

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      const bookButton = screen.getByRole('button', { name: /confirm booking/i });
      
      // Click multiple times rapidly
      await user.click(bookButton);
      await user.click(bookButton);
      await user.click(bookButton);

      // Should only process once
      await waitFor(() => {
        expect(callCount).toBe(1);
      });

      // Button should be disabled during processing
      expect(bookButton).toBeDisabled();
      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('should use idempotency key for retry safety', async () => {
      const user = userEvent.setup();

      const mockProcessBooking = jest.fn().mockResolvedValue({
        success: true,
        booking: { id: 'booking-123' },
      });
      jest.spyOn(require('@/lib/api-client'), 'processBooking')
        .mockImplementation(mockProcessBooking);

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      const bookButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(bookButton);

      await waitFor(() => {
        expect(mockProcessBooking).toHaveBeenCalledWith(
          expect.objectContaining({
            idempotencyKey: expect.any(String),
          })
        );
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during booking', async () => {
      const user = userEvent.setup();

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      const bookButton = screen.getByRole('button', { name: /confirm booking/i });
      await user.click(bookButton);

      // Should show loading
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(bookButton).toBeDisabled();
    });

    it('should show loading state while fetching Gems balance', () => {
      (getGemsBalance as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(1000), 1000))
      );

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      // Should show skeleton/loading
      expect(screen.getByText(/loading gems/i)).toBeInTheDocument();
    });
  });

  describe('User Experience', () => {
    it('should show real-time price updates', async () => {
      const user = userEvent.setup();

      render(<BookingFlow classData={mockClass} user={mockUser} />);

      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });

      // Slide to different values
      fireEvent.change(gemsSlider, { target: { value: '200' } });
      await waitFor(() => {
        expect(screen.getByText('Final Price: $18.00')).toBeInTheDocument();
      });

      fireEvent.change(gemsSlider, { target: { value: '500' } });
      await waitFor(() => {
        expect(screen.getByText('Final Price: $15.00')).toBeInTheDocument();
      });

      fireEvent.change(gemsSlider, { target: { value: '1000' } });
      await waitFor(() => {
        expect(screen.getByText('Final Price: $10.00')).toBeInTheDocument();
      });
    });

    it('should show Gems savings prominently', async () => {
      render(<BookingFlow classData={mockClass} user={mockUser} />);

      const gemsSlider = screen.getByRole('slider', { name: /gems to use/i });
      fireEvent.change(gemsSlider, { target: { value: '1000' } });

      await waitFor(() => {
        expect(screen.getByText(/you save \$10/i)).toBeInTheDocument();
      });
    });
  });
});
