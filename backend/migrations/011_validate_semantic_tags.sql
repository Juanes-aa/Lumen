-- 011_validate_semantic_tags.sql
--
-- Restricciones de integridad para semantic_tags:
--   1. tag_type solo acepta los valores que genera el servicio de IA.
--   2. confidence debe estar en el rango [0.0, 1.0].
--
-- Si el modelo de IA genera un tag_type desconocido, la inserción falla
-- en lugar de silenciosamente aceptar datos corruptos.

ALTER TABLE semantic_tags
    ADD CONSTRAINT valid_tag_type CHECK (
        tag_type IN (
            'temas_principales',
            'tipo_narrativa',
            'dilemas_eticos',
            'directores_estilo_similar',
            'nivel_filosofico',
            'palabras_clave'
        )
    );

ALTER TABLE semantic_tags
    ADD CONSTRAINT valid_confidence CHECK (
        confidence >= 0.0 AND confidence <= 1.0
    );
