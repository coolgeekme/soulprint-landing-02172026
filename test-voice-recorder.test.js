/**
 * Voice Recorder Component Test
 * Direct testing of fixed VoiceRecorderV3 component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VoiceRecorderV3 } from '@/components/voice-recorder/VoiceRecorderV3';

// Mock navigator.mediaDevices for testing
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: { getUserMedia: mockGetUserMedia }
});

// Mock MediaRecorder
const mockMediaRecorder = {
  state: 'inactive',
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  ondataavailable: null,
  onstop: null
};

global.MediaRecorder = jest.fn(() => mockMediaRecorder);

describe('VoiceRecorderV3 - Stop Button Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('stop button should be clickable during recording', async () => {
    const mockStream = new MediaStream();
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    const onComplete = jest.fn();
    const onError = jest.fn();
    
    render(
      <VoiceRecorderV3 
        onAnalysisComplete={onComplete}
        onError={onError}
        compact={true}
      />
    );

    // Start recording
    const recordButton = screen.getByRole('button');
    fireEvent.click(recordButton);
    
    // Wait for recording to start
    await waitFor(() => {
      expect(recordButton).toHaveAttribute('aria-label', 'Stop recording');
    });

    // Test stop button click
    fireEvent.click(recordButton);
    
    // Should respond immediately (no race condition)
    expect(mockMediaRecorder.stop).toHaveBeenCalled();
    expect(recordButton).toHaveAttribute('aria-label', 'Start recording');
  });

  test('should handle rapid start/stop sequences', async () => {
    const mockStream = new MediaStream();
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    render(<VoiceRecorderV3 compact={true} />);
    
    const recordButton = screen.getByRole('button');
    
    // Rapid start/stop sequence
    fireEvent.click(recordButton); // Start
    fireEvent.click(recordButton); // Stop immediately
    fireEvent.click(recordButton); // Start again
    fireEvent.click(recordButton); // Stop again
    
    // All actions should work without getting stuck
    expect(mockMediaRecorder.start).toHaveBeenCalledTimes(2);
    expect(mockMediaRecorder.stop).toHaveBeenCalledTimes(2);
  });

  test('should cleanup properly on stop', async () => {
    const mockStream = new MediaStream();
    const mockTrack = { stop: jest.fn() };
    mockStream.getTracks = jest.fn().mockReturnValue([mockTrack]);
    
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    render(<VoiceRecorderV3 compact={true} />);
    
    const recordButton = screen.getByRole('button');
    fireEvent.click(recordButton); // Start
    fireEvent.click(recordButton); // Stop
    
    // Should cleanup all resources
    await waitFor(() => {
      expect(mockTrack.stop).toHaveBeenCalled();
    });
  });

  test('should handle auto-stop without race condition', async () => {
    const mockStream = new MediaStream();
    mockGetUserMedia.mockResolvedValue(mockStream);
    
    render(<VoiceRecorderV3 compact={true} maxDuration={2} />);
    
    const recordButton = screen.getByRole('button');
    fireEvent.click(recordButton); // Start
    
    // Wait for auto-stop (2 seconds)
    await waitFor(() => {
      expect(mockMediaRecorder.stop).toHaveBeenCalled();
    }, { timeout: 3000 });
    
    // Should not get stuck in recording state
    expect(recordButton).toHaveAttribute('aria-label', 'Start recording');
  });
});

console.log('✅ Voice Recorder Unit Tests Created');
console.log('📋 These tests validate:');
console.log('   - Stop button responsiveness');
console.log('   - Race condition prevention');
console.log('   - Resource cleanup');
console.log('   - Auto-stop functionality');
console.log('   - Rapid start/stop sequences');