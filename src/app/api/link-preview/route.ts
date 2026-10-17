import { NextResponse } from 'next/server'
import { getLinkPreview } from 'link-preview-js'

export async function GET(request: Request) {
  // Pega a URL que o seu componente frontend enviou
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL é obrigatória' }, { status: 400 })
  }

  try {
    // O servidor do Next.js faz a busca (sem bloqueio de CORS)
    const data = await getLinkPreview(url, {
      imagesPropertyType: 'og', // Pega a imagem de capa do site
      headers: {
        'user-agent': 'googlebot', // Simula um robô de busca para não ser bloqueado
      },
      timeout: 3000, // Tempo máximo de espera
    })
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao buscar preview:', error)
    return NextResponse.json({ error: 'Não foi possível buscar o preview' }, { status: 500 })
  }
}