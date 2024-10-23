from flask import Flask, render_template, request, jsonify
import pandas as pd
import json
import os

app = Flask(__name__)

# Load data
def load_excel_data():
    try:
        df = pd.read_excel("ITEMLIST.xlsx")
        return df.to_dict('records')
    except FileNotFoundError:
        return []

def load_item_relationships():
    try:
        with open("item_relationships.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

df = load_excel_data()
item_relationships = load_item_relationships()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    query = request.json['query'].lower()
    # Ensure the 'Item Description' is a string and check for None or NaN values
    results = [item for item in df if isinstance(item['Item Description'], str) and query in item['Item Description'].lower()]
    return jsonify(results)


@app.route('/fetch', methods=['POST'])
def fetch():
    parent_code = request.json['code']
    if parent_code in item_relationships:
        parent_item = next((item for item in df if item['Item Code'] == parent_code), None)
        if parent_item:
            children = []
            for child_code, child_qty in item_relationships[parent_code]['children'].items():
                child_item = next((item for item in df if item['Item Code'] == child_code), None)
                if child_item:
                    children.append({**child_item, 'Quantity': child_qty})
            return jsonify({
                'parent': {**parent_item, 'Quantity': item_relationships[parent_code]['qty']},
                'children': children
            })
    return jsonify({'error': 'Not found'})

@app.route('/associate', methods=['POST'])
def associate():
    items = request.json['items']
    try:
        parent_code, parent_qty = items[0].split(':')
        parent_qty = int(parent_qty)
        child_items = [item.split(':') for item in items[1:]]
        
        if any(item['Item Code'] == parent_code for item in df):
            item_relationships[parent_code] = {"qty": parent_qty, "children": {}}
            for child_code, child_qty in child_items:
                child_qty = int(child_qty)
                if any(item['Item Code'] == child_code for item in df):
                    item_relationships[parent_code]["children"][child_code] = child_qty
                else:
                    return jsonify({'error': f"Child item code '{child_code}' does not exist."})
            
            with open("item_relationships.json", "w") as f:
                json.dump(item_relationships, f)
            
            return jsonify({'success': f"Items associated with parent code '{parent_code}'."})
        else:
            return jsonify({'error': f"Parent item code '{parent_code}' does not exist in inventory data."})
    except Exception as e:
        return jsonify({'error': f"An error occurred: {str(e)}"})

@app.route('/export', methods=['POST'])
def export():
    items = request.json['items']
    try:
        export_df = pd.DataFrame(items, columns=["No.", "Description", "Quantity", "UoM Name", "Remark", "Warehouse"])
        filename = "exported_data.xlsx"
        export_df.to_excel(filename, index=False)
        return jsonify({'success': f"Data exported to '{filename}' successfully!"})
    except Exception as e:
        return jsonify({'error': f"Failed to export data: {str(e)}"})

if __name__ == '__main__':
    app.run(debug=True)