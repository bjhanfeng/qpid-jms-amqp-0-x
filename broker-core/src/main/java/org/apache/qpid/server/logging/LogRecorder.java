/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.qpid.server.logging;

import java.util.Collections;
import java.util.Iterator;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.core.helpers.CyclicBuffer;
import org.slf4j.LoggerFactory;

public class LogRecorder implements Iterable<LogRecord>
{

    private final RecordEventAppender _eventAppender;

    public LogRecorder(RecordEventAppender eventAppender)
    {
        _eventAppender = eventAppender;
    }

    @Override
    public Iterator<LogRecord> iterator()
    {
        final CyclicBuffer<LogRecord> buffer = _eventAppender.getBuffer();
        return buffer != null ?  buffer.asList().iterator() : Collections.<LogRecord>emptyIterator();
    }

}
