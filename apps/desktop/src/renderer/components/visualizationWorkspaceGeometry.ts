export const WORKSPACE_HORIZONTAL_RESERVE = 160;
export const WORKSPACE_VERTICAL_RESERVE = 144;
export const WORKSPACE_MAX_WIDTH = 1120;
export const WORKSPACE_MAX_HEIGHT = 720;
export const WORKSPACE_EDGE_MARGIN = 20;
export const WORKSPACE_MIN_TOP = 48;
export const WORKSPACE_INITIAL_TOP = 56;

export interface WorkspacePosition {
  x: number;
  y: number;
}

export interface WorkspaceSize {
  width: number;
  height: number;
}

export function getWorkspaceSize(
  viewportWidth: number,
  viewportHeight: number,
): WorkspaceSize {
  return {
    width: Math.min(
      WORKSPACE_MAX_WIDTH,
      Math.max(0, viewportWidth - WORKSPACE_HORIZONTAL_RESERVE),
    ),
    height: Math.min(
      WORKSPACE_MAX_HEIGHT,
      Math.max(0, viewportHeight - WORKSPACE_VERTICAL_RESERVE),
    ),
  };
}

export function clampWorkspacePosition(
  position: WorkspacePosition,
  viewportWidth: number,
  viewportHeight: number,
  workspaceSize: WorkspaceSize,
): WorkspacePosition {
  const maxX = Math.max(
    WORKSPACE_EDGE_MARGIN,
    viewportWidth - workspaceSize.width - WORKSPACE_EDGE_MARGIN,
  );
  const maxY = Math.max(
    WORKSPACE_MIN_TOP,
    viewportHeight - workspaceSize.height - WORKSPACE_EDGE_MARGIN,
  );

  return {
    x: Math.min(Math.max(position.x, WORKSPACE_EDGE_MARGIN), maxX),
    y: Math.min(Math.max(position.y, WORKSPACE_MIN_TOP), maxY),
  };
}

export function getInitialWorkspacePosition(
  viewportWidth: number,
  viewportHeight: number,
): WorkspacePosition {
  const workspaceSize = getWorkspaceSize(viewportWidth, viewportHeight);
  return clampWorkspacePosition(
    {
      x: (viewportWidth - workspaceSize.width) / 2,
      y: WORKSPACE_INITIAL_TOP,
    },
    viewportWidth,
    viewportHeight,
    workspaceSize,
  );
}
