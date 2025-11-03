import styled from '@emotion/styled';

export const BtnLite = styled.div<{
  isActive?: boolean;
  activeColor?: string;
  direction?: 'row' | 'column';
  disabled?: boolean;
}>`
  display: flex;
  align-items: center;
  border-radius: 4px;
  background-color: #fff;
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  padding: 8px;
  gap: 8px;
  font-weight: bold;
  &.col {
    flex-direction: column;
  }

  flex-direction: ${props => props.direction || 'row'};

  &.bold {
    font-weight: bold;
  }

  &:active {
    background-color: #ccc;
  }

  ${props =>
    props.isActive &&
    `
    background-color: #eee;
    color: ${props.activeColor || '#1a87ff'};
  `}

  &.active {
    background-color: #eee;
    color: ${props => props.activeColor || '#1a87ff'};
  }

  &.disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  ${props =>
    props.disabled &&
    `
    opacity: 0.4;
    cursor: not-allowed;
  `}

  .border_icon {
    border: 1px solid rgba(226, 232, 240, 1);
    border-radius: 50%;
    padding: 8px;
    &.sm {
      padding: 4px;
    }
    &.lg {
      padding: 12px;
    }
  }
`;

export const BtnLiteColumn = styled(BtnLite)`
  flex-direction: column;
  width: auto;
  font-size: 12px;
  gap: 0;
  font-weight: bold;
`;

export const Sep = styled.div`
  margin: 0;
  background-color: #f0f0f0;
  width: 1px;
  height: 12px;
`;
