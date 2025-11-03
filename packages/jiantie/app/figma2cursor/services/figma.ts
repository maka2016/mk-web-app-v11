import axios from 'axios';

export interface FigmaConfig {
  accessToken: string;
  fileKey: string;
}

export class FigmaService {
  private accessToken: string;
  private baseUrl = 'https://api.figma.com/v1';

  constructor(config: FigmaConfig) {
    this.accessToken = config.accessToken;
  }

  private getHeaders() {
    return {
      'X-Figma-Token': this.accessToken,
      'Content-Type': 'application/json',
    };
  }

  async getFile(fileKey: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/files/${fileKey}`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Figma file:', error);
      throw error;
    }
  }

  async getNode(fileKey: string, nodeId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/files/${fileKey}/nodes?ids=${nodeId}`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching Figma node:', error);
      throw error;
    }
  }

  async getImageFills(fileKey: string, nodeIds: string[]) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/images/${fileKey}?ids=${nodeIds.join(',')}`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching Figma images:', error);
      throw error;
    }
  }
}
