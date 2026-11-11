"""Selectores CSS/XPath de la interfaz web de Facebook.

Los selectores cambian frecuentemente. Centralizarlos aquí facilita el mantenimiento.
"""

SELECTORS = {
    # Login
    "login_email": "input[name='email']",
    "login_password": "input[name='pass']",
    "login_button": "button[name='login']",
    "login_2fa_code": "input[name='approvals_code']",
    "login_2fa_submit": "button[name='submit']",
    "checkpoint_container": "[data-testid='checkpoint']",

    # Navegación
    "home_feed": "[role='feed']",
    "profile_menu": "[aria-label='Tu perfil']",
    "page_switcher": "[aria-label='Cambiar de página']",

    # Publicación
    "create_post_button": "[aria-label='Crear una publicación']",
    "post_textarea": "[contenteditable='true'][role='textbox']",
    "post_photo_button": "[aria-label='Foto/video']",
    "publish_button": "[aria-label='Publicar']",
    "post_success_toast": "[role='alert']",

    # Comentarios
    "comment_button": "[aria-label='Comentar']",
    "comment_input": "[contenteditable='true'][role='textbox'][aria-label*='comentario']",
    "comment_submit": "[aria-label='Comentar'][role='button']",

    # Reacciones
    "like_button": "[aria-label='Me gusta']",
    "reaction_picker": "[aria-label='Elige una reacción']",
    "reaction_love": "[aria-label='Me encanta']",
    "reaction_haha": "[aria-label='Me divierte']",
    "reaction_wow": "[aria-label='Me asombra']",
    "reaction_sad": "[aria-label='Me entristece']",
    "reaction_angry": "[aria-label='Me enoja']",

    # Lectura
    "post_container": "[role='article']",
    "post_text": "[data-ad-preview='message']",
    "post_author": "h3 a, strong a",
    "post_timestamp": "[data-utime]",
    "post_reactions_count": "[aria-label*='reacciones']",
    "post_comments_count": "[aria-label*='comentarios']",
    "comment_container": "[role='article'] ul li",
    "comment_text": "[dir='auto']",
    "comment_author": "a[role='link']",

    # Creación de Página
    "page_create_name": "input[name='name'], input[aria-label*='Nombre de la Página'], input[aria-label*='Page name']",
    "page_create_category": "input[aria-label*='Categoría'], input[aria-label*='Category'], input[placeholder*='Categoría'], input[placeholder*='Category']",
    "page_create_submit": "button:has-text('Crear página'), button:has-text('Create Page'), button:has-text('Crear Página')",
    "page_create_skip": "button:has-text('Omitir'), button:has-text('Skip'), button:has-text('Ahora no')",
}
