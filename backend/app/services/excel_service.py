import os
import re
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
from sqlalchemy import text
from app.extensions import db
from app.models.dataset import Dataset, DatasetTable
from app.utils.security import sanitize_identifier
from app.utils.validators import allowed_file

class ExcelService:
    @staticmethod
    def read_dataframe(file_path: str, filename: str) -> pd.DataFrame:
        """Read CSV or Excel into pandas DataFrame."""
        ext = filename.rsplit('.', 1)[1].lower()
        if ext == 'csv':
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='latin1')
        elif ext in ('xlsx', 'xls'):
            df = pd.read_excel(file_path)
        else:
            raise ValueError(f"Unsupported file extension: .{ext}")

        if df.empty:
            raise ValueError("The uploaded file contains no data rows.")

        return df

    @staticmethod
    def infer_sql_type(series: pd.Series) -> str:
        """Infer MySQL column type from pandas Series."""
        # Drop NA to inspect actual values
        s = series.dropna()
        if s.empty:
            return "VARCHAR(255)"

        # Check boolean
        if pd.api.types.is_bool_dtype(s):
            return "BOOLEAN"

        # Check integer
        if pd.api.types.is_integer_dtype(s):
            return "INT"

        # Check float
        if pd.api.types.is_float_dtype(s):
            return "DOUBLE"

        # Check datetime
        if pd.api.types.is_datetime64_any_dtype(s):
            return "DATETIME"

        # If object/string, check if values can be parsed as dates or numbers
        if pd.api.types.is_string_dtype(s) or pd.api.types.is_object_dtype(s):
            # Check maximum string length
            max_len = s.astype(str).map(len).max()
            if max_len > 255:
                return "TEXT"
            return "VARCHAR(255)"

        return "VARCHAR(255)"

    @classmethod
    def preview_uploaded_file(cls, file_obj, filename: str) -> Dict[str, Any]:
        """Generate preview metadata and first 5 rows for user confirmation."""
        if not allowed_file(filename):
            raise ValueError("Invalid file format. Please upload .xlsx, .xls, or .csv")

        # Save temporarily to parse
        temp_dir = Path("uploads_temp")
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / f"preview_{os.urandom(8).hex()}_{filename}"
        file_obj.save(str(temp_path))

        try:
            df = cls.read_dataframe(str(temp_path), filename)

            # Sanitize columns for preview
            raw_columns = list(df.columns)
            clean_columns = []
            seen = set()
            for col in raw_columns:
                c = sanitize_identifier(str(col))
                orig_c = c
                idx = 1
                while c in seen:
                    c = f"{orig_c}_{idx}"
                    idx += 1
                seen.add(c)
                clean_columns.append(c)

            df.columns = clean_columns

            # Infer types
            column_types = {col: cls.infer_sql_type(df[col]) for col in clean_columns}

            # Preview rows (convert NaN to None for JSON serialization)
            preview_rows = df.head(5).where(pd.notnull(df), None).to_dict(orient='records')

            return {
                'filename': filename,
                'total_rows': int(len(df)),
                'total_columns': int(len(clean_columns)),
                'columns': clean_columns,
                'column_types': column_types,
                'preview_rows': preview_rows
            }
        finally:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    @classmethod
    def import_to_mysql(cls, user_id: int, dataset_name: str, table_name: str, file_obj, filename: str) -> Dict[str, Any]:
        """
        Create dataset, sanitize identifiers, create MySQL physical table,
        insert data, and save metadata.
        """
        if not dataset_name or not dataset_name.strip():
            raise ValueError("Dataset name is required.")

        clean_table_name = sanitize_identifier(table_name or filename.rsplit('.', 1)[0])
        if not clean_table_name:
            clean_table_name = "data_table"

        # Save file to temp path
        temp_dir = Path("uploads_temp")
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / f"import_{os.urandom(8).hex()}_{filename}"
        file_obj.save(str(temp_path))

        try:
            df = cls.read_dataframe(str(temp_path), filename)

            # Clean column names
            clean_columns = []
            seen = set()
            for col in df.columns:
                c = sanitize_identifier(str(col))
                orig_c = c
                idx = 1
                while c in seen:
                    c = f"{orig_c}_{idx}"
                    idx += 1
                seen.add(c)
                clean_columns.append(c)

            df.columns = clean_columns

            # Determine source type
            ext = filename.rsplit('.', 1)[1].lower()
            source_type = 'csv' if ext == 'csv' else 'excel'

            # 1. Create Dataset model
            dataset = Dataset(
                user_id=user_id,
                name=dataset_name.strip(),
                source_type=source_type
            )
            db.session.add(dataset)
            db.session.flush()  # generates dataset.id

            # Physical table name: e.g. ds_{dataset.id}_{clean_table_name}
            physical_table = f"ds_{dataset.id}_{clean_table_name}"

            # 2. Determine column definitions
            col_defs = []
            for col in clean_columns:
                col_type = cls.infer_sql_type(df[col])
                col_defs.append(f"`{col}` {col_type}")

            if db.engine.dialect.name == 'sqlite':
                create_table_sql = f"""
                CREATE TABLE `{physical_table}` (
                    `_row_id` INTEGER PRIMARY KEY AUTOINCREMENT,
                    {', '.join(col_defs)}
                );
                """
            else:
                create_table_sql = f"""
                CREATE TABLE `{physical_table}` (
                    `_row_id` INT AUTO_INCREMENT PRIMARY KEY,
                    {', '.join(col_defs)}
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """

            # Execute table creation
            db.session.execute(text(create_table_sql))

            # 3. Insert rows in batches
            # Convert NaN to None for MySQL NULL
            records = df.where(pd.notnull(df), None).to_dict(orient='records')
            if records:
                cols_joined = ", ".join([f"`{c}`" for c in clean_columns])
                params_joined = ", ".join([f":{c}" for c in clean_columns])
                insert_sql = text(f"INSERT INTO `{physical_table}` ({cols_joined}) VALUES ({params_joined})")

                # Insert in chunks of 500
                chunk_size = 500
                for i in range(0, len(records), chunk_size):
                    db.session.execute(insert_sql, records[i:i + chunk_size])

            # 4. Save metadata in dataset_tables
            dataset_table = DatasetTable(
                dataset_id=dataset.id,
                table_name=clean_table_name,
                physical_table_name=physical_table,
                row_count=len(records)
            )
            db.session.add(dataset_table)
            db.session.commit()

            return {
                'dataset': dataset.to_dict(include_tables=True),
                'table': dataset_table.to_dict(),
                'columns': clean_columns,
                'row_count': len(records)
            }
        except Exception as e:
            db.session.rollback()
            raise e
        finally:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

    @classmethod
    def import_table_to_dataset(cls, user_id: int, dataset_id: int, table_name: str, file_obj, filename: str) -> Dict[str, Any]:
        """
        Import an Excel/CSV file into an existing dataset as a new table.
        """
        dataset = Dataset.query.filter_by(id=dataset_id, user_id=user_id).first()
        if not dataset:
            raise ValueError("Dataset not found or access denied.")

        clean_table_name = sanitize_identifier(table_name or filename.rsplit('.', 1)[0])
        if not clean_table_name:
            clean_table_name = "data_table"

        existing = DatasetTable.query.filter_by(dataset_id=dataset.id, table_name=clean_table_name).first()
        if existing:
            raise ValueError(f"Table '{clean_table_name}' already exists in this dataset.")

        # Save file to temp path
        temp_dir = Path("uploads_temp")
        temp_dir.mkdir(exist_ok=True)
        temp_path = temp_dir / f"import_{os.urandom(8).hex()}_{filename}"
        file_obj.save(str(temp_path))

        try:
            df = cls.read_dataframe(str(temp_path), filename)

            # Clean column names
            clean_columns = []
            seen = set()
            for col in df.columns:
                c = sanitize_identifier(str(col))
                orig_c = c
                idx = 1
                while c in seen:
                    c = f"{orig_c}_{idx}"
                    idx += 1
                seen.add(c)
                clean_columns.append(c)

            df.columns = clean_columns

            physical_table = f"ds_{dataset.id}_{clean_table_name}"

            # Determine column definitions
            col_defs = []
            for col in clean_columns:
                col_type = cls.infer_sql_type(df[col])
                col_defs.append(f"`{col}` {col_type}")

            if db.engine.dialect.name == 'sqlite':
                create_table_sql = f"""
                CREATE TABLE `{physical_table}` (
                    `_row_id` INTEGER PRIMARY KEY AUTOINCREMENT,
                    {', '.join(col_defs)}
                );
                """
            else:
                create_table_sql = f"""
                CREATE TABLE `{physical_table}` (
                    `_row_id` INT AUTO_INCREMENT PRIMARY KEY,
                    {', '.join(col_defs)}
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """

            db.session.execute(text(create_table_sql))

            records = df.where(pd.notnull(df), None).to_dict(orient='records')
            if records:
                cols_joined = ", ".join([f"`{c}`" for c in clean_columns])
                params_joined = ", ".join([f":{c}" for c in clean_columns])
                insert_sql = text(f"INSERT INTO `{physical_table}` ({cols_joined}) VALUES ({params_joined})")

                chunk_size = 500
                for i in range(0, len(records), chunk_size):
                    db.session.execute(insert_sql, records[i:i + chunk_size])

            dataset_table = DatasetTable(
                dataset_id=dataset.id,
                table_name=clean_table_name,
                physical_table_name=physical_table,
                row_count=len(records)
            )
            db.session.add(dataset_table)
            db.session.commit()

            return {
                'dataset': dataset.to_dict(include_tables=True),
                'table': dataset_table.to_dict(),
                'columns': clean_columns,
                'row_count': len(records)
            }
        except Exception as e:
            db.session.rollback()
            raise e
        finally:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass

