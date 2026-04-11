/**
 * Storybook stories for the UndoRedo components.
 */
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { UndoRedoToolbar, useUndoRedo } from '../components/UndoRedo';

const meta: Meta<typeof UndoRedoToolbar> = {
  title: 'Designer/UndoRedoToolbar',
  component: UndoRedoToolbar,
  parameters: { layout: 'centered' },
};

export default meta;
type Story = StoryObj<typeof UndoRedoToolbar>;

export const Default: Story = {
  args: {
    canUndo: true,
    canRedo: false,
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
    undoCount: 3,
    redoCount: 0,
  },
};

export const BothEnabled: Story = {
  args: {
    canUndo: true,
    canRedo: true,
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
    undoCount: 5,
    redoCount: 2,
  },
};

export const BothDisabled: Story = {
  args: {
    canUndo: false,
    canRedo: false,
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
    undoCount: 0,
    redoCount: 0,
  },
};

function InteractiveDemo() {
  const { current, push, undo, redo, canUndo, canRedo, undoCount, redoCount } =
    useUndoRedo(0, { debounceMs: 0 });
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center' }}>
      <UndoRedoToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        undoCount={undoCount}
        redoCount={redoCount}
      />
      <div style={{ marginTop: 20, fontSize: 24 }}>Counter: {current}</div>
      <button
        onClick={() => push(current + 1)}
        style={{ marginTop: 10, padding: '8px 16px', fontSize: 14 }}
      >
        Increment
      </button>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveDemo />,
};
