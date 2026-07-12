from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool
from sqlmodel import SQLModel

from alembic import context

from app.core.config import settings
from app.models import models  # noqa: F401  (registra las tablas de negocio en SQLModel.metadata)
from app.models import sri_models  # noqa: F401  (registra las tablas del SRI en SQLModel.metadata)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# MetaData de TODOS los modelos SQLModel del proyecto (negocio + SRI, ambos
# usan el registro por defecto de SQLModel). Se filtra por tabla más abajo
# según qué base se esté migrando (ver include_name).
target_metadata = SQLModel.metadata

# Dos bases de datos, un solo entorno de Alembic. Cada una es una "rama"
# independiente (branch_labels en la migración raíz de cada una) con su
# propia carpeta de versiones (alembic/versions/business y .../sri) y su
# propia tabla alembic_version (viven en archivos SQLite distintos, así que
# no colisionan aunque se llamen igual).
DATABASES = {
    "business": {
        "url": settings.DATABASE_URL,
        "tables": {
            "cliente",
            "nota_credito",
            "expediente",
            "documento",
            "riesgo",
            "historial_estados",
        },
    },
    "sri": {
        "url": settings.SRI_DATABASE_URL,
        "tables": {
            "notas_sri",
            "contribuyentes_sri",
        },
    },
}

# Selección de base: alembic -x db=business ... / alembic -x db=sri ...
x_args = context.get_x_argument(as_dictionary=True)
db_name = x_args.get("db", "business")
if db_name not in DATABASES:
    raise ValueError(f"Base desconocida: {db_name!r}. Usa -x db=business o -x db=sri")

db_info = DATABASES[db_name]
config.set_main_option("sqlalchemy.url", db_info["url"])


def include_name(name, type_, parent_names):
    # Con las dos bases compartiendo un mismo MetaData de Python, esto es lo
    # que evita que, por ejemplo, al migrar "sri" se intenten crear también
    # las tablas de negocio (y viceversa).
    if type_ == "table":
        return name in db_info["tables"]
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
        include_name=include_name,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
            include_name=include_name,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
