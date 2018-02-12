/*Allows creation of dynamic tables that are able to sort "clickable rows" based on headers*/
class DynamicTable {
    constructor(container) {
        this.rows = [];

        this.table = $('<table class="dynamicTable"></table>').appendTo(container);
        this.headerContainer = $('<tr></tr>').appendTo(this.table);
        this.headerContainer.css('cursor', 'pointer');
    }

    _sortFunction(array, columnIndex, isAscending) {
        function naturalCompare(b, a) {
            var bText = b.children().eq(columnIndex).val();
            var aText = a.children().eq(columnIndex).val();

            var ax = [], bx = [];

            aText.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
            bText.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });
            
            while(ax.length && bx.length) {
                var an = ax.shift();
                var bn = bx.shift();
                var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
                if(nn) return nn;
            }

            return ax.length - bx.length;
        }

        array.sort(naturalCompare);
        
        if (isAscending == true) {
            return array.reverse();
        } else {
            return array;
        }
    }

    _restructureRows(rows) {
        this.table.slice(1).remove();

        for (var i = 0; i < rows.length; i++) {
            rows[i].appendTo(this.table);
        }
    }

    addBasicHeader(headerText) {
        return $('<th class="unselectable">' + headerText + '</th>').appendTo(this.headerContainer);
    }

    // Dynamic headers have the ability to sort the column (ascending & descending)
    addDynamicHeader(headerText) {
        var header = $('<th class="unselectable">' + headerText + '<span></span></th>').appendTo(this.headerContainer);
        var columnIndex = 0;
        var isAscending = false;

        header.click(function() {
            header.children().each(function(index, element) {
                // Removes all arrows except the clicked element's child.
                this.headerContainer.children().each(function(ind, child) {
                    if ($(child).is(header) == false) {
                        $(child).children().each(function(i, grandChild) {
                            $(grandChild).removeClass('arrowUp').removeClass('arrowDown');
                        });
                    } else {
                        columnIndex = ind;
                    }
                });

                if ($(element).hasClass('arrowUp')) {
                    $(element).removeClass('arrowUp').addClass('arrowDown');

                    isAscending = false;
                } else if ($(element).hasClass('arrowDown')) {
                    $(element).removeClass('arrowDown').addClass('arrowUp');

                    isAscending = true;
                } else {
                    $(element).addClass('arrowDown');

                    isAscending = false;
                }

                this.rows = this._sortFunction(this.rows, columnIndex, isAscending);
                this._restructureRows(this.rows);
            }.bind(this));
        }.bind(this));
        
        return header;
    }

    addRow(onClickFunction, data) {
        var row = $('<tr></tr>').appendTo(this.table);
        
        if (onClickFunction) {
            row.click(function(e) {
                if (e.target && e.target.localName == 'button') {
                    e.stopPropagation();
                    return;
                }
                onClickFunction(data);
            });

            row.css('cursor', 'pointer');
        }

        this.rows.push(row);
        
        if (this.rows.length > 0) {
            this.table.show();
        }
        return row;
    }

    /* columnValue is optional and used in the sort function */
    addColumn(row, columnText, columnValue) {
        if (columnValue == undefined) {
            columnValue = columnText;
        }
        var column = $('<td>' + columnText + '</td>').appendTo(row);
        column.val(columnValue);
        return column;
    }

    removeRow(row) {
        for (var i = this.rows.length -1; i >= 0; i--) {
            if (this.rows[i].is(row) == true) {
                this.rows.splice(i, 1);
            }
        }

        if (this.rows.length == 0) {
            this.table.hide();
        }
        row.remove();
    }

    getRowCount() {
        return this.rows.length;
    }
}