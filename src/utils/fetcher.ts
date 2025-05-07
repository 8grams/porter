export class Fetcher {
  static async fetch(
    path: string,
    options: RequestInit = {},
  ): Promise<unknown> {
    const baseUrl = import.meta.env.WEBSITE_URL;
    const url = new URL(path, baseUrl).toString();

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}
