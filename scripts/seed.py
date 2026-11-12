"""Seed de datos de ejemplo: comunidad gatos + 15 personajes + proveedores LLM."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import engine, init_db
from app.db.models import (
    Comunidad, Personaje, ProveedorLLM, ModeloLLM, MemoryEntry, MemoryScope,
)
from sqlmodel import Session

from app.db.fichas import FICHAS_PERSONAJES as personajes_data

init_db()


def seed():
    with Session(engine) as session:
        comunidad = Comunidad(
            nombre="Comunidad Gatos",
            tematica="Gatos y adopción",
            descripcion_interna="Comunidad de referencia: personajes con identidad propia, memoria e historial social.",
        )
        session.add(comunidad)
        session.commit()
        session.refresh(comunidad)
        print(f"Comunidad creada: {comunidad.nombre} ({comunidad.id})")

        # Los 15 personajes REALES de la comunidad, con su ficha de voz
        # completa según la spec de comportamiento del proyecto
        # (fichas v1 del 2026-11-08: voz, largo, ortografía, emojis,
        # reacción de firma y nivel de actividad por personaje).
        # nombre = nombre de la Página en Facebook.

        for data in personajes_data:
            personaje = Personaje(
                nombre=data["nombre"],
                comunidad_id=comunidad.id,
                nivel_actividad=data["actividad"],
                personalidad=data["personalidad"],
                biografia_interna=data["bio"],
            )
            session.add(personaje)
        session.commit()
        print(f"Personajes creados: {len(personajes_data)}")

        # Proveedores
        prov_ollama = ProveedorLLM(nombre="Ollama local", tipo_api="openai_compatible", base_url="http://localhost:11434/v1", activo=True, prioridad=10)
        session.add(prov_ollama)
        session.commit()
        session.refresh(prov_ollama)
        modelo = ModeloLLM(nombre="llama3.1", identificador_tecnico="llama3.1", proveedor_id=prov_ollama.id, disponible=True, prioridad=10)
        session.add(modelo)
        session.commit()
        print(f"Proveedor creado: {prov_ollama.nombre}")

        prov_openai = ProveedorLLM(nombre="OpenAI", tipo_api="openai_compatible", base_url="https://api.openai.com/v1", activo=False, prioridad=20)
        session.add(prov_openai)
        session.commit()
        session.refresh(prov_openai)
        modelo2 = ModeloLLM(nombre="gpt-4o-mini", identificador_tecnico="gpt-4o-mini", proveedor_id=prov_openai.id, disponible=True, prioridad=20)
        session.add(modelo2)
        session.commit()
        print(f"Proveedor creado: {prov_openai.nombre}")

        # Memoria inicial
        memorias = [
            {"scope": MemoryScope.INDIVIDUAL, "owner": "Luna", "summary": "Publicó una historia sobre Milo. Sofi comentó y guardó el post.", "comunidad_id": comunidad.id},
            {"scope": MemoryScope.COLECTIVA, "owner": "Comunidad Gatos", "summary": "Tema recurrente: adoptabilidad de gatos callejeros en zona norte.", "comunidad_id": comunidad.id},
            {"scope": MemoryScope.EPISODICA, "owner": "Bruno + Sofi", "summary": "Conversación sobre veterinaria en zona norte; pidieron turno.", "comunidad_id": comunidad.id},
            {"scope": MemoryScope.SEMANTICA, "owner": "Mesh", "summary": "El bot de research cita fuentes primarias cuando el tema es técnico.", "comunidad_id": comunidad.id},
        ]
        for m in memorias:
            entry = MemoryEntry(**m)
            session.add(entry)
        session.commit()
        print(f"Memorias creadas: {len(memorias)}")

        print("\nSeed completado exitosamente.")


if __name__ == "__main__":
    seed()
