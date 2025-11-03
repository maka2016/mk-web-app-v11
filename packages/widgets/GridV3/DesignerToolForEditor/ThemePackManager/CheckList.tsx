import React, { useState } from 'react';
import styled from '@emotion/styled';
import { Button } from '@workspace/ui/components/button';
import { queryToObj } from '@mk/utils';

const Container = styled.div`
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
`;

const UrlInput = styled.input`
  width: 100%;
  padding: 8px;
  margin-bottom: 20px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
`;

const Checklist = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const Label = styled.span`
  font-size: 14px;
  color: #333;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
`;

export default function CheckList() {
  const [url, setUrl] = useState('');
  const [checklist, setChecklist] = useState({
    imageReplacement: false,
    iosLayout: false,
    usability: false,
  });

  const handleCheckboxChange = (key: keyof typeof checklist) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <Container>
      <div style={{ marginBottom: 16 }}>
        <Button
          onClick={() => {
            const urlParams = queryToObj();
            window.open(
              `https://www.maka.im/heditor7/index.html?page_id=${urlParams.works_id}&uid=${urlParams.uid}&no_save=true`
            );
          }}
        >
          打开检查地址
        </Button>
      </div>

      <Checklist>
        <CheckboxItem>
          <Checkbox
            type='checkbox'
            checked={checklist.imageReplacement}
            onChange={() => handleCheckboxChange('imageReplacement')}
          />
          <Label>模拟图片替换</Label>
        </CheckboxItem>

        <CheckboxItem>
          <Checkbox
            type='checkbox'
            checked={checklist.iosLayout}
            onChange={() => handleCheckboxChange('iosLayout')}
          />
          <Label>检查iOS排版是否准确</Label>
        </CheckboxItem>

        <CheckboxItem>
          <Checkbox
            type='checkbox'
            checked={checklist.usability}
            onChange={() => handleCheckboxChange('usability')}
          />
          <Label>检查易用性</Label>
        </CheckboxItem>
      </Checklist>
    </Container>
  );
}
